import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallbackLabel?: string };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('YLT render crash', error?.message || error);
    console.error(error?.stack);
    console.error('componentStack', info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center px-6" style={{ backgroundColor: 'var(--bg-page, #f4f5f7)' }}>
        <div className="max-w-md rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-crimson-600">Something went wrong</p>
          <h1 className="mt-2 font-display text-xl font-bold text-navy-900">{this.props.fallbackLabel || 'YLT Travels hit a display error.'}</h1>
          <p className="mt-2 text-sm text-slate-600">Your session is still here. Reload this page or open Partner ERP again from Sign In.</p>
          {this.state.error?.message ? (
            <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">{this.state.error.message}</p>
          ) : null}
          <button
            type="button"
            className="btn-primary mt-5 text-sm"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
