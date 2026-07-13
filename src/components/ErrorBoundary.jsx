import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crash:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Coś poszło nie tak</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Wystąpił błąd podczas renderowania strony. Spróbuj ponownie lub odśwież aplikację.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Spróbuj ponownie
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2.5 text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Odśwież stronę
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}