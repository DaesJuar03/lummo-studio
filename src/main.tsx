import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext';
import { initPlatformBridge } from './lib/bridge';

// Inicializa el puente nativo de Tauri 2 automáticamente si corre en Rust/WebView2
initPlatformBridge();

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  );
}
