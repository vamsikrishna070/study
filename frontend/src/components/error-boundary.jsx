import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[StudyArena ErrorBoundary caught an unexpected error]:', error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  resetError = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const Fallback = this.props.FallbackComponent;
    if (Fallback) return <Fallback error={this.state.error} resetError={this.resetError} />;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-lg text-center">
          <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            StudyArena ran into an unexpected problem. Please try again. If the problem continues, refresh the page or try again later.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.resetError}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Try Again
            </button>
            <a
              href="/"
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}