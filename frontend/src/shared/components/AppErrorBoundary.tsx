import { Component } from 'react';
import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { env } from '@/config/env';
import { ServerErrorPage } from '@/pages/error/ServerErrorPage';

interface State {
  hasError: boolean;
}

/**
 * Outermost of the four error layers (Phase 6.1 decision F7): a React error
 * boundary that catches render-time exceptions anywhere in the provider/app
 * tree and shows the generic error surface instead of a blank screen. Routing
 * errors are handled separately by the router's error element (RouteError);
 * this boundary is the last resort for everything above/around the router.
 *
 * Must be a class component — React exposes error boundaries only via the
 * class lifecycle.
 */
export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (env.isDev) {
      console.error('Uncaught render error:', error, info);
    }
  }

  private readonly handleReload = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ServerErrorPage
          message="Застосунок несподівано завершив роботу."
          actionLabel="Перезавантажити"
          onAction={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}
