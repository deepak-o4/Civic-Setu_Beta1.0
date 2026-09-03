import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const StatusBadge = ({ status, className }) => {
  const getStatusStyles = (s) => {
    switch (s?.toLowerCase()) {
      case 'pending':
      case 'submitted':
        return 'bg-ink/5 text-ink border-ink/10';
      case 'assigned':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'in progress':
      case 'in_progress':
      case 'processing':
        return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'resolved':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
      case 'closed':
      case 'failed':
      case 'failed_final':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'escalated':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      default:
        return 'bg-ink/5 text-ink border-ink/10';
    }
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          getStatusStyles(status),
          className
        )
      )}
    >
      {status ? status.toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

export default StatusBadge;
