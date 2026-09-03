import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, count, icon: Icon, colorClass }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-3xl p-6 shadow-card border border-ink/5 hover:shadow-soft hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer"
    >
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-accent/10 blur-xl group-hover:bg-accent/20 transition-colors" />
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-muted uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-ink mt-1 tracking-tight">{count}</h3>
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
