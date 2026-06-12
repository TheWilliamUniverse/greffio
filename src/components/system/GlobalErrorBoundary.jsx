import React from 'react';
import { MobileErrorFallback } from '@/components/system/MobileErrorFallback.jsx';
import { isChunkLoadError, reloadForChunkError } from '@/utils/chunkRecovery.js';
import { reportClientError } from '@/utils/observability/errorReporting.js';

export class GlobalErrorBoundary extends React.Component {
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
      console.error('[GlobalErrorBoundary]', error, info);
    }
    reportClientError(error, { source: 'GlobalErrorBoundary', componentStack: info?.componentStack || null });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <MobileErrorFallback
          title="Greffio a rencontré un problème"
          message="L’application n’a pas pu s’afficher correctement. Réessayez ou revenez à l’accueil."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
