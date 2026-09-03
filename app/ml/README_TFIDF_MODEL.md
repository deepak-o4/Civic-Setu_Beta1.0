# CivicSetu Classical ML Model (Category + Severity Classifier)

This file documents the model trained via `train_tfidf.py`, which is separate
from the LLM-based routing engine (`core_ai/routing_engine.py`, Groq/Llama)
that the live app uses by default. This classical ML path is the offline
fallback described in `app/ml/train.py`'s original design — it had code but
no data and no trained artifacts before this change.

## What was done

1. **Data source**: Real, live records pulled from NYC Open Data's public
   311 Service Requests API (Socrata dataset `erm2-nwe9`,
   `https://data.cityofnewyork.us/resource/erm2-nwe9.json`) — no API key
   required. 55 real complaint records (complaint_type, descriptor, agency,
   borough) were fetched and turned into natural-language complaint
   sentences, saved at `app/ml/data/raw/train.csv`.
2. **Labels**: `category` (Water / Roads / Sanitation / Security / General
   Desk — matching the categories used by the Groq routing engine) and
   `severity` (low / medium / high) were derived from the real
   `complaint_type`/`agency` fields via an explicit rule-based mapping (see
   the mapping logic that produced train.csv), not invented.
3. **Model**: `TfidfVectorizer` (scikit-learn) + `LogisticRegression`
   (category) and `RandomForestClassifier` (severity), both with
   `class_weight="balanced"`.
4. **Artifacts produced**: `app/ml/models/classifier.pkl`,
   `severity.pkl`, `encoders.pkl`, `tfidf_vectorizer.pkl` — all loaded by
   `ModelLoader` (`app/services/ml/model_loader.py`), which now exposes
   `ModelLoader().predict(text)` for direct offline inference.

## Why TF-IDF instead of XGBoost/PyTorch/sentence-transformers

The original pipeline (`train.py`) targets `xgboost`, `imbalanced-learn`
(SMOTE), and `sentence-transformers` (BERT embeddings via `torch`). None of
these could be installed in the sandbox this was built in — there was no
outbound network access for `pip install`. `train_tfidf.py` is a fully
offline, scikit-learn-only equivalent that writes the same three artifact
files, so `model_loader.py` works unchanged. If you deploy somewhere with
internet access, install the extra packages and run `python -m app.ml.train`
instead — it will overwrite the same files with (likely stronger) models.

## Known limitations — read before relying on this in production

- **Dataset size**: only 55 rows (52 after cleaning). The API endpoint has
  millions of records, but this environment could only pull data inline
  through a page-fetch tool with a response-size cap, not a bulk file
  download — so the training set is a small, honest sample, not the full
  dataset. Category classes are imbalanced (Roads/Security dominate; Water,
  Sanitation, General Desk have only 2–4 examples each).
- **Measured accuracy** on a held-out split: ~62% accuracy / 0.33 macro-F1
  for category, ~77% accuracy / 0.59 macro-F1 for severity. This is usable
  as a demo/fallback, not production-grade.
- **To improve**: pull the full dataset (via `requests` + the Socrata API
  with pagination, `$limit`/`$offset`, ideally with an app token) in an
  environment with real network access, then run `train_tfidf.py` (or
  `train.py` if xgboost/torch are installable) against a properly sized,
  balanced dataset — thousands of rows per category, not tens.
- The live app's actual complaint routing (`core_ai/routing_engine.py`)
  uses the Groq LLM API, not this model, and is unaffected by any of the
  above — this classical pipeline is a self-contained addition available
  for offline/low-cost classification if wired in elsewhere.

## Retraining

```bash
python -m app.ml.train_tfidf
```
Reads `app/ml/data/raw/train.csv`, retrains, and overwrites the four
artifact files in `app/ml/models/`.
