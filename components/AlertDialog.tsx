
import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { COLORS } from '../constants';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <AlertCircle size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-100 leading-none">{title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-950/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-all active:scale-95 ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20' : 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
