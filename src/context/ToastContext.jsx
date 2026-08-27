import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/common/ToastContainer';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Limit to max 5 visible toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((title, message) => addToast({ type: 'success', title, message }), [addToast]);
  const showError = useCallback((title, message) => addToast({ type: 'error', title, message }), [addToast]);
  const showInfo = useCallback((title, message) => addToast({ type: 'info', title, message }), [addToast]);
  const showWarning = useCallback((title, message) => addToast({ type: 'warning', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe dummy functions if rendered outside provider
    return {
      addToast: () => {},
      removeToast: () => {},
      showSuccess: (t, m) => console.log('Toast success:', t, m),
      showError: (t, m) => console.error('Toast error:', t, m),
      showInfo: (t, m) => console.log('Toast info:', t, m),
      showWarning: (t, m) => console.warn('Toast warning:', t, m)
    };
  }
  return context;
}
