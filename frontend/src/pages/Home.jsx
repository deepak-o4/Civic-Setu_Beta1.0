import React, { useState } from 'react';
import { useSubmitComplaint } from '../services/queries';
import { FileText, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import ImageIssueUpload from '../components/ImageIssueUpload';
import LocationPicker from '../components/LocationPicker';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const Home = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ title: '', description: '', district: '', department: '', phone: '' });
  const [successData, setSuccessData] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [issueImage, setIssueImage] = useState(null);
  const [aiSeverityMeta, setAiSeverityMeta] = useState(null);
  const [pinLocation, setPinLocation] = useState(null);
  const { user } = useAuth();

  const { mutateAsync: submitComplaint, isPending: loading } = useSubmitComplaint();

  const handleImageAnalyzed = (result, mappedDepartment) => {
    if (!result) {
      setAiSeverityMeta(null);
      return;
    }
    setAiSeverityMeta(result);
    setFormData((prev) => ({
      ...prev,
      department: mappedDepartment || prev.department,
      description: prev.description || result.ai_description || prev.description,
      title: prev.title || result.category,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    
    const submissionData = new FormData();
    submissionData.append('citizen_name', user?.name || 'Citizen');
    submissionData.append('citizen_email', user?.email || 'citizen@example.com');
    submissionData.append('citizen_phone', formData.phone);
    submissionData.append('title', formData.title);
    submissionData.append('description', formData.description);
    submissionData.append('district', formData.district);
    submissionData.append('category', formData.department);
    if (pinLocation) {
      submissionData.append('lat', pinLocation.lat);
      submissionData.append('lon', pinLocation.lng);
    }
    if (issueImage) {
      submissionData.append('attachments', issueImage);
    }

    try {
      const res = await submitComplaint(submissionData);
      setSuccessData(res);
      setFormData({ title: '', description: '', district: '', department: '', phone: '' });
      setIssueImage(null);
      setAiSeverityMeta(null);
      setPinLocation(null);
    } catch (error) {
      // The error message is automatically parsed by our Axios interceptor!
      setLocalError(error.message || 'Failed to submit complaint. Please try again.');
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <AnimatedPage className="relative min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="blob-decor top-[8%] -left-[8%] w-[36%] h-[36%] bg-accent/25"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="blob-decor bottom-[6%] -right-[8%] w-[30%] h-[36%] bg-primary-400/25"
        />
      </div>

      <div className="w-full max-w-2xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-5">
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ink text-accent mb-2 shadow-soft"
          >
            <FileText className="w-8 h-8" />
          </motion.div>
          <span className="pill-tag">{t('complaintForm.badge')}</span>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-ink tracking-tight leading-[1.05]">
            {t('complaintForm.headerPrefix')} <span className="relative inline-block">
              {t('complaintForm.headerWord')}
              <svg className="absolute -bottom-1 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none">
                <path d="M0,6 Q50,0 100,5 T200,4" stroke="#C6F135" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="text-lg text-muted font-medium max-w-md mx-auto">
            {t('complaintForm.headerSubtitle')}
          </p>
        </div>

        {/* Main Form Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative card p-8 md:p-10 overflow-hidden"
        >
          {localError && (
            <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl text-center font-medium border border-rose-100 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {localError}
            </div>
          )}

          <AnimatePresence mode="wait">
            {successData ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center py-8 space-y-6"
              >
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center text-primary-700 shadow-sm border border-accent/30"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-display font-extrabold text-ink tracking-tight">{t('complaintForm.successTitle')}</h2>
                  <p className="text-muted mt-2 font-medium">{t('complaintForm.successSubtitle')}</p>
                </div>
                
                <div className="bg-ink text-white p-6 rounded-3xl inline-block w-full max-w-sm mt-4 relative overflow-hidden">
                  <p className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1 relative z-10">{t('complaintForm.yourTicketId')}</p>
                  <p className="text-3xl font-display font-black text-accent relative z-10">{successData.ticket_id}</p>
                  <p className="text-xs text-white/40 mt-2 relative z-10">{t('complaintForm.saveTicketId')}</p>
                </div>

                <button 
                  onClick={() => setSuccessData(null)} 
                  className="btn-secondary w-full mt-8 py-4 text-base"
                >
                  {t('complaintForm.submitAnother')}
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <ImageIssueUpload
                    district={formData.district}
                    onFileSelected={setIssueImage}
                    onResult={handleImageAnalyzed}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('complaintForm.complaintTitle')}</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder={t('complaintForm.titlePlaceholder')}
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('complaintForm.phone')}</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder={t('complaintForm.phonePlaceholder')}
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                  />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div variants={itemVariants} className="space-y-1.5 group">
                    <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('complaintForm.district')}</label>
                    <input
                      type="text"
                      name="district"
                      required
                      placeholder={t('complaintForm.districtPlaceholder')}
                      value={formData.district}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1.5 group">
                    <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('complaintForm.category')}</label>
                    <select
                      name="department"
                      required
                      value={formData.department}
                      onChange={handleChange}
                      className="input-field appearance-none"
                    >
                      <option value="" disabled className="text-muted">{t('complaintForm.selectCategory')}</option>
                      <option value="Roads">{t('complaintForm.categoryRoads')}</option>
                      <option value="Water">{t('complaintForm.categoryWater')}</option>
                      <option value="Waste">{t('complaintForm.categoryWaste')}</option>
                      <option value="Electricity">{t('complaintForm.categoryElectricity')}</option>
                      <option value="Drainage">{t('complaintForm.categoryDrainage')}</option>
                      <option value="Public Facilities">{t('complaintForm.categoryPublicFacilities')}</option>
                      <option value="Other">{t('complaintForm.categoryOther')}</option>
                    </select>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants}>
                  <LocationPicker
                    onChange={setPinLocation}
                    onAddressGuess={(guess) => {
                      setFormData((prev) => (prev.district ? prev : { ...prev, district: guess }));
                    }}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-ink/70 ml-1 group-focus-within:text-primary-700 transition-colors">{t('complaintForm.description')}</label>
                  <textarea
                    name="description"
                    required
                    rows="4"
                    placeholder={t('complaintForm.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={handleChange}
                    className="input-field resize-none"
                  ></textarea>
                </motion.div>

                <motion.button 
                  variants={itemVariants}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  type="submit" 
                  disabled={loading}
                  className={`btn-primary w-full py-4 text-base ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('complaintForm.submit')}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300 opacity-90" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatedPage>
  );
};

export default Home;
