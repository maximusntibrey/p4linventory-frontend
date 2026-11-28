import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Box from '@mui/material/Box';
import { useLocation } from 'react-router-dom';
import { Home } from 'components/icons';
import { Button, LinkButton, PageHeader } from './ui';

type Props = {
  children: ReactNode;
  /** Changes when the user moves to another page: a new page starts with a clean slate. */
  resetKey?: string;
  /** Plain markup without theme or router, for the outermost boundary. */
  bare?: boolean;
};

const MESSAGE = 'Something went wrong while showing this page. Your data is safe.';

/** A render error must never leave a blank screen: show what happened, a way to retry and a way home. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No user data: the error text and component stack only.
    console.error('Page render failed:', error.message, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const retry = () => this.setState({ error: null });
    if (this.props.bare) {
      return (
        <div role="alert" className="bare-error">
          <style>
            {
              '.bare-error{padding:16px;font-family:Inter,sans-serif}.bare-error button,.bare-error a{display:inline-block;min-height:44px;min-width:44px;padding:12px}'
            }
          </style>
          <h1>Something went wrong</h1>
          <p>{MESSAGE}</p>
          <p>
            <button type="button" onClick={retry}>
              Retry
            </button>{' '}
            <a href="/">Back to Home</a>
          </p>
        </div>
      );
    }
    return (
      <Box
        role="alert"
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
      >
        <PageHeader title="Something went wrong" subtitle={MESSAGE} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={retry}>Retry</Button>
          <LinkButton to="/" icon={Home} variant="secondary">
            Back to Home
          </LinkButton>
        </Box>
      </Box>
    );
  }
}

/** Boundary for the routed page: resets when the address changes. */
export function RouteBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary resetKey={useLocation().pathname}>{children}</ErrorBoundary>;
}
