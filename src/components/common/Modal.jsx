import React, { useEffect } from 'react';
import '../../css/modal.css';

/**
 * A generic reusable Modal component.
 * 
 * @param {boolean} isOpen - Whether the modal is visible.
 * @param {function} onClose - Function to call when closing the modal.
 * @param {string} title - The title of the modal.
 * @param {React.ReactNode} children - The content of the modal.
 * @param {React.ReactNode} footer - Optional footer content (buttons etc).
 * @param {string} className - Optional custom class name.
 */
export default function Modal({ isOpen, onClose, title, children, footer, className = '' }) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className}`} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h3>{title}</h3>}
          <button className="modal-close-btn" onClick={onClose} aria-label="Sluiten">
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
