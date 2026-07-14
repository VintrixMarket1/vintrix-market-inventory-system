import React from "react";

/**
 * Lightweight error boundary for modals — catches render crashes
 * and shows a friendly message inside the modal instead of
 * crashing the entire app (important on weak/mobile devices).
 */
export default class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Modal crash:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">😵</div>
          <h3 className="font-bold text-slate-800">Coś poszło nie tak</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Urządzenie może mieć zbyt mało pamięci. Zamknij i spróbuj ponownie — użyj mniejszej liczby zdjęć.
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Spróbuj ponownie
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
              >
                Zamknij
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}