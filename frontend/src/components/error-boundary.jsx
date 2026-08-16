import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
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
          <h1 className="font-display text-3xl">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This part of StudyArena hit an error. Try again or return to the dashboard.
          </p>
          <button type="button" onClick={this.resetError} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Try again
          </button>
        </div>
      </div>
    );
  }
}