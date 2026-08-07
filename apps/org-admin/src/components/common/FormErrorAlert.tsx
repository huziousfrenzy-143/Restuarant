import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface FormErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const FormErrorAlert: React.FC<FormErrorAlertProps> = ({ message, onDismiss, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}>
      <div className="flex items-center gap-2 flex-1">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="leading-tight">{message}</span>
      </div>
      {onDismiss && (
        <button 
          type="button" 
          onClick={onDismiss} 
          className="text-red-700/70 hover:text-red-900 hover:bg-red-100 rounded transition-colors p-1"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
