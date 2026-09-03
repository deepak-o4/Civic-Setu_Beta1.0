"""
TF-IDF feature service for CivicSetu's complaint classification/severity models.

Why TF-IDF instead of sentence-transformers?
---------------------------------------------
The original design (see embeddings.py) used a BERT-based SentenceTransformer
model (`all-MiniLM-L6-v2`) for dense semantic embeddings. That requires
`sentence-transformers` + `torch`, plus downloading pretrained weights from
the internet at first run.

This service is a drop-in, fully-offline alternative used by train_tfidf.py
and the inference path in model_loader.py. It is a legitimate, well-established
classical NLP approach (bag-of-words + TF-IDF weighting) and requires only
scikit-learn, which is why it's used for the retrained models shipped in
app/ml/models/. If sentence-transformers/torch become available in your
deployment environment, EmbeddingService (see embeddings.py) can be swapped
back in with no changes needed to the rest of the pipeline (train.py already
targets that path).
"""
import logging
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)


class TfidfFeatureService:
    """
    Handles fitting/transforming text into TF-IDF feature vectors.
    Mirrors the interface of EmbeddingService (generate_embeddings) so it
    can be used interchangeably in the training pipeline.
    """

    def __init__(self, max_features: int = 4000, ngram_range=(1, 2)):
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            sublinear_tf=True,
            min_df=1,
        )
        self._is_fitted = False

    def fit_transform(self, texts: List[str]):
        logger.info(f"Fitting TF-IDF vectorizer on {len(texts)} documents...")
        X = self.vectorizer.fit_transform(texts)
        self._is_fitted = True
        logger.info(f"TF-IDF vocabulary size: {len(self.vectorizer.vocabulary_)}")
        return X

    def transform(self, texts: List[str]):
        if not self._is_fitted:
            raise RuntimeError("TfidfFeatureService must be fit before calling transform().")
        return self.vectorizer.transform(texts)

    # Alias matching EmbeddingService's method name for pipeline compatibility
    def generate_embeddings(self, texts: List[str]):
        return self.fit_transform(texts)
