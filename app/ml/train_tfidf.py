"""
CivicSetu ML Training Pipeline (offline-safe variant).

Trains the two models used by app/services/ml/model_loader.py:
  - classifier.pkl : predicts the routing category (Water / Roads / Sanitation
                      / Security / General Desk) from complaint text
  - severity.pkl   : predicts urgency (low / medium / high) from complaint text

Data source
-----------
app/ml/data/raw/train.csv was built from live records pulled from NYC Open
Data's 311 Service Requests dataset (Socrata endpoint erm2-nwe9,
https://data.cityofnewyork.us/resource/erm2-nwe9.json), which is public,
free, and requires no API key. Each row's `text` column is a natural-language
complaint sentence generated from the real complaint_type/descriptor/borough
fields returned by the API; `category` and `severity` are derived from the
real complaint_type/agency via an explicit, documented mapping (see
build_dataset.py) rather than being invented.

Why this pipeline differs from train.py
----------------------------------------
train.py (the original design) targets XGBoost + imbalanced-learn SMOTE +
sentence-transformer embeddings + PyTorch. Those packages could not be
installed in this environment (no outbound network access for pip), so this
script is a faithful, fully-offline equivalent built entirely on
scikit-learn + TF-IDF:
  - TfidfFeatureService (tfidf_features.py) replaces EmbeddingService
  - class_weight='balanced' replaces SMOTE oversampling
  - LogisticRegression / RandomForestClassifier replace XGBoost

If your deployment has internet access for `pip install xgboost
imbalanced-learn torch sentence-transformers`, train.py can be used instead
with no changes to model_loader.py, since both scripts write out the same
three artifacts (classifier.pkl, severity.pkl, encoders.pkl).

Run with: python -m app.ml.train_tfidf
"""
import logging
import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from app.ml.preprocess import DataPreprocessor
from app.ml.tfidf_features import TfidfFeatureService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class TfidfTrainPipeline:
    def __init__(self, data_path: str, output_dir: str = "app/ml/models"):
        self.data_path = data_path
        self.output_dir = output_dir
        self.preprocessor = DataPreprocessor()
        self.features = TfidfFeatureService()
        os.makedirs(self.output_dir, exist_ok=True)

    def load_data(self) -> pd.DataFrame:
        logger.info(f"Loading data from {self.data_path}...")
        df = pd.read_csv(self.data_path)
        logger.info(f"Loaded {len(df)} records.")
        return df

    def _split(self, X, y):
        """Stratified split when every class has >=2 members, else a plain split."""
        counts = pd.Series(y).value_counts()
        if (counts >= 2).all() and len(counts) > 1:
            return train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        logger.warning("Some classes too small to stratify; using a plain random split.")
        return train_test_split(X, y, test_size=0.25, random_state=42)

    def train_and_eval(self, X, y, label_encoder: LabelEncoder, name: str, use_rf: bool = False):
        X_train, X_test, y_train, y_test = self._split(X, y)

        if use_rf:
            model = RandomForestClassifier(
                n_estimators=200, random_state=42, class_weight="balanced", max_depth=12
            )
        else:
            model = LogisticRegression(
                max_iter=2000, class_weight="balanced", C=2.0
            )

        logger.info(f"Fitting {name} model ({model.__class__.__name__})...")
        model.fit(X_train, y_train)

        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average="macro", zero_division=0)
        logger.info(f"[{name}] Test Accuracy: {acc:.4f} | Macro F1: {f1:.4f}")
        labels_present = sorted(set(y_test) | set(preds))
        target_names = [label_encoder.inverse_transform([lab])[0] for lab in labels_present]
        logger.info(
            f"[{name}] Classification report:\n"
            + classification_report(y_test, preds, labels=labels_present, target_names=target_names, zero_division=0)
        )
        return model

    def run(self):
        logger.info("Starting CivicSetu ML Training Pipeline (TF-IDF / scikit-learn variant)...")

        df = self.load_data()
        df, cat_enc, sev_enc = self.preprocessor.process(df)

        logger.info(">>> Fitting shared TF-IDF vectorizer on complaint text <<<")
        X = self.features.fit_transform(df["cleaned_text"].tolist())

        logger.info(">>> Phase 1: Category Classification Model <<<")
        y_cat = df["category_encoded"].values
        clf_model = self.train_and_eval(X, y_cat, cat_enc, name="Category", use_rf=False)

        logger.info(">>> Phase 2: Severity Model <<<")
        y_sev = df["severity_encoded"].values
        sev_model = self.train_and_eval(X, y_sev, sev_enc, name="Severity", use_rf=True)

        logger.info(">>> Phase 3: Exporting artifacts <<<")
        clf_path = os.path.join(self.output_dir, "classifier.pkl")
        sev_path = os.path.join(self.output_dir, "severity.pkl")
        enc_path = os.path.join(self.output_dir, "encoders.pkl")
        vec_path = os.path.join(self.output_dir, "tfidf_vectorizer.pkl")

        joblib.dump(clf_model, clf_path)
        joblib.dump(sev_model, sev_path)
        self.preprocessor.save_encoders(enc_path)
        joblib.dump(self.features.vectorizer, vec_path)

        logger.info(f"Saved: {clf_path}, {sev_path}, {enc_path}, {vec_path}")
        logger.info("CivicSetu ML pipeline completed successfully.")


if __name__ == "__main__":
    pipeline = TfidfTrainPipeline(data_path="app/ml/data/raw/train.csv")
    try:
        pipeline.run()
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise
