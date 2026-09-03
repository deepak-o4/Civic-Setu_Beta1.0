import threading
import logging
import joblib
import os

logger = logging.getLogger(__name__)

class ModelLoader:
    """
    Singleton class to ensure ML models are loaded into memory only once.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(ModelLoader, cls).__new__(cls)
                cls._instance._classifier = None
                cls._instance._severity_model = None
                cls._instance._encoders = None
                cls._instance._vectorizer = None
                cls._instance._is_loaded = False
        return cls._instance
        
    def load_models(self, models_dir: str = "app/ml/models"):
        """
        Loads the trained models, TF-IDF vectorizer, and encoders into memory.
        """
        with self._lock:
            if self._is_loaded:
                return
                
            try:
                clf_path = os.path.join(models_dir, 'classifier.pkl')
                sev_path = os.path.join(models_dir, 'severity.pkl')
                enc_path = os.path.join(models_dir, 'encoders.pkl')
                vec_path = os.path.join(models_dir, 'tfidf_vectorizer.pkl')
                
                if not os.path.exists(clf_path):
                    logger.warning(f"Models not found at {models_dir}. Ensure training has completed.")
                    return
                
                self._classifier = joblib.load(clf_path)
                self._severity_model = joblib.load(sev_path)
                self._encoders = joblib.load(enc_path)
                if os.path.exists(vec_path):
                    self._vectorizer = joblib.load(vec_path)
                
                self._is_loaded = True
                logger.info("Fine-tuned models loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading models: {e}")
                raise e
            
    def get_classifier(self):
        if not self._is_loaded:
            self.load_models()
        return self._classifier
        
    def get_severity_model(self):
        if not self._is_loaded:
            self.load_models()
        return self._severity_model
        
    def get_encoders(self):
        if not self._is_loaded:
            self.load_models()
        return self._encoders

    def get_vectorizer(self):
        if not self._is_loaded:
            self.load_models()
        return self._vectorizer

    def predict(self, text: str) -> dict:
        """
        Runs the locally-trained TF-IDF classifier + severity model on raw
        complaint text and returns predicted category/severity with
        confidence scores. This is the offline, non-LLM counterpart to
        AIRoutingAssignmentEngine.classify_complaint_text() in
        core_ai/routing_engine.py (which calls the Groq API instead) -
        useful as a fast, free, no-API-key fallback or for pre-filtering.
        """
        if not self._is_loaded:
            self.load_models()
        if not (self._classifier and self._severity_model and self._encoders and self._vectorizer):
            raise RuntimeError("Models not loaded. Run `python -m app.ml.train_tfidf` first.")

        import re
        cleaned = re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', ' ', text.lower())).strip()
        X = self._vectorizer.transform([cleaned])

        cat_enc = self._encoders["category"]
        sev_enc = self._encoders["severity"]

        cat_pred = self._classifier.predict(X)[0]
        sev_pred = self._severity_model.predict(X)[0]

        result = {
            "category": cat_enc.inverse_transform([cat_pred])[0],
            "severity": sev_enc.inverse_transform([sev_pred])[0],
        }
        if hasattr(self._classifier, "predict_proba"):
            result["category_confidence"] = round(float(self._classifier.predict_proba(X).max()), 4)
        if hasattr(self._severity_model, "predict_proba"):
            result["severity_confidence"] = round(float(self._severity_model.predict_proba(X).max()), 4)
        return result
