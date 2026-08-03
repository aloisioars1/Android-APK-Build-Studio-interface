import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center font-sans select-none">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl shrink-0">
                ⚠️
              </div>
              <div>
                <h1 className="text-lg font-black text-white uppercase tracking-wider">
                  Ops! Ocorreu uma falha na interface
                </h1>
                <p className="text-xs text-slate-400">
                  O ErrorBoundary capturou um erro não tratado para impedir a tela em branco.
                </p>
              </div>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-white/5 space-y-2 font-mono text-xs overflow-x-auto">
              <p className="text-red-400 font-bold">
                {this.state.error?.toString() || "Erro desconhecido de renderização"}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>🔄 Tentar Tentar Novamente</span>
              </button>

              <button
                onClick={this.handleReload}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <span>🌐 Recarregar Página</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="py-3 px-4 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-rose-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>🧹 Limpar Dados Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
