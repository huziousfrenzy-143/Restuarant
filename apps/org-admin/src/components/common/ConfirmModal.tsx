import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ConfirmModalProps } from './ConfirmModal.types';

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-surface border border-mist rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border-mist">
        <div className="p-4 border-b border-mist flex items-center justify-between bg-steel">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${
              variant === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-ink font-mono">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-graphite hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-graphite font-medium leading-relaxed">{message}</p>

          <div className="flex items-center gap-2 pt-2 font-mono text-xs">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-3 rounded border border-mist text-graphite hover:bg-steel font-semibold transition-all"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-2 px-3 rounded text-white font-bold transition-all shadow-sm ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
