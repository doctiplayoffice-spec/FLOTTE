import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (isOpen) onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [isOpen, onClose]);

  return (
    <dialog 
      ref={dialogRef}
      className="p-0 rounded-none border border-slate-400 bg-white text-gray-900 shadow-lg max-w-lg w-[90%] outline-none backdrop:bg-black/25"
    >
      <div className="flex justify-between items-center bg-slate-100 px-4 py-2 border-b border-slate-300">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-200 border border-transparent hover:border-slate-300 text-gray-500 transition"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </dialog>
  );
}
