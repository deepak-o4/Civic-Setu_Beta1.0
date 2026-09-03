import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { useAnalyzeComplaintImage } from '../services/queries';

// Maps the AI's fine-grained India-specific issue category to CivicSetu's
// department dropdown values used elsewhere in the complaint form.
const CATEGORY_TO_DEPARTMENT = {
  'Pothole': 'Roads',
  'Road Damage': 'Roads',
  'Damaged Footpath / Pavement': 'Roads',
  'Traffic Signal Not Working': 'Roads',
  'Illegal Construction': 'Roads',
  'Encroachment': 'Roads',
  'Water Leakage / Pipe Burst': 'Water',
  'No Water Supply': 'Water',
  'Garbage Dump': 'Waste',
  'Garbage Vehicle Not Arrived': 'Waste',
  'Dustbins Not Cleaned': 'Waste',
  'Sweeping Not Done': 'Waste',
  'Dead Animal': 'Waste',
  'Illegal Dumping': 'Waste',
  'Public Toilet Issue': 'Waste',
  'Stray Animal Menace': 'Waste',
  'Damaged Electric Pole / Exposed Wiring': 'Electricity',
  'Streetlight Not Working': 'Electricity',
  'Sewage Overflow': 'Drainage',
  'Drainage / Waterlogging': 'Drainage',
  'Open Manhole': 'Drainage',
  'Broken Park Bench / Amenity': 'Public Facilities',
  'Fallen Tree / Branch': 'Public Facilities',
  'Graffiti / Vandalism': 'Public Facilities',
  'Other / Unclassified': 'Other',
};

const PRIORITY_STYLES = {
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  MEDIUM: 'bg-primary-100 text-primary-800 border-primary-200',
  LOW: 'bg-ink/5 text-ink border-ink/10',
};

/**
 * Photo-based issue classifier: citizen uploads a photo, we call the
 * vision-model image classifier + India-calibrated severity engine, and
 * surface the suggested category/severity so it can pre-fill the rest of
 * the complaint form (see onResult).
 */
const ImageIssueUpload = ({ district, onResult, onFileSelected }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const { mutateAsync: analyzeImage, isPending: analyzing } = useAnalyzeComplaintImage();

  const handleFile = (selected) => {
    if (!selected) return;
    setError(null);
    setResult(null);
    setFile(selected);
    onFileSelected?.(selected);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null);
    const data = new FormData();
    data.append('image', file);
    if (district) data.append('location', district);

    try {
      const res = await analyzeImage(data);
      setResult(res);
      onResult?.(res, CATEGORY_TO_DEPARTMENT[res.category] || 'Other');
    } catch (err) {
      setError(err.message || 'Could not analyze this photo. You can still fill the form manually.');
    }
  };

  const clear = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setError(null);
    onFileSelected?.(null);
    onResult?.(null, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-ink/70 ml-1 flex items-center gap-1.5">
        <Camera className="w-4 h-4" /> Photo of the issue (optional, AI-analyzed)
      </label>

      {!preview ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-ink/15 rounded-2xl p-8 text-center hover:border-accent hover:bg-accent/5 transition-all duration-200"
        >
          <Upload className="w-7 h-7 mx-auto text-muted mb-2" />
          <p className="text-sm font-semibold text-ink/70">Click to upload or drag a photo here</p>
          <p className="text-xs text-muted mt-1">e.g. a pothole, garbage dump, broken streetlight — PNG/JPG up to 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-ink/10">
          <img src={preview} alt="Issue preview" className="w-full max-h-64 object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {!result && (
            <div className="absolute bottom-2 left-2 right-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className={`w-full py-2.5 rounded-full bg-accent text-ink font-bold text-sm flex items-center justify-center gap-2 shadow-soft hover:bg-accent-dark transition-all ${analyzing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {analyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing photo...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Analyze with AI</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium border border-rose-100 flex items-center gap-2 overflow-hidden"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-background rounded-2xl p-4 border border-ink/10 space-y-2"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="pill-tag">{result.category}</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${PRIORITY_STYLES[result.priority] || PRIORITY_STYLES.LOW}`}>
                {result.priority} PRIORITY · {result.severity_score}/10
              </span>
            </div>
            {result.ai_description && (
              <p className="text-sm text-ink/70">{result.ai_description}</p>
            )}
            <p className="text-xs text-muted">{result.reasoning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageIssueUpload;
