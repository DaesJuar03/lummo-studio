import React from 'react';
import UserErrorModal from '../modals/UserErrorModal';

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
        <UserErrorModal 
          error={this.state.error}
          title="Problema Temporal en la Vista"
          onClose={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
          theme={this.props.theme || 'dark'}
        />
      );
    }

    return this.props.children;
  }
}
