import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lummo ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center max-w-xl mx-auto space-y-4 py-24">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Se produjo un problema al cargar esta vista</h3>
            <p className="text-xs text-slate-500 font-mono mt-2 p-3 bg-slate-100 rounded-xl border border-slate-200 text-left overflow-x-auto">
              {this.state.error?.toString()}
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center space-x-2 shadow-md shadow-blue-600/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Recargar Lummo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
