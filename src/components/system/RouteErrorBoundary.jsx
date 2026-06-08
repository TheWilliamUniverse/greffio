import React from 'react';
import { MobileErrorFallback } from '@/components/system/MobileErrorFallback.jsx';
import { isChunkLoadError, reloadForChunkError } from '@/utils/chunkRecovery.js';
import { reportClientError } from '@/utils/observability/errorReporting.js';

export class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error?.message || '')) {
      reloadForChunkError();
      return;
    }
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary]', error, info);
    }
    reportClientError(error, { source: 'RouteErrorBoundary', componentStack: info?.componentStack || null });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <MobileErrorFallback
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
