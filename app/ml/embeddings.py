import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Handles generating dense vector embeddings from text using BERT-based models.
    """
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        logger.info(f"Loading embedding model: {model_name}")
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
        except ImportError:
            logger.warning("SentenceTransformers is unavailable; using API/fallback classification.")
            self.model = None
        
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Converts a list of text strings into a numpy array of embeddings.
        """
        logger.info(f"Generating embeddings for {len(texts)} texts...")
        # show_progress_bar=True helps track progress for large datasets
        if self.model is None:
            return np.empty((0, 0))
        embeddings = self.model.encode(texts, show_progress_bar=True)
        return embeddings
