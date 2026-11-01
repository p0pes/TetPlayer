import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Erro crítico capturado na interface:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetAndReload = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="w-screen h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col items-center justify-center p-6 select-none"
        >
          <div className="max-w-lg w-full bg-[#141724] border border-red-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Falha na Inicialização da Interface
              </h1>
              <p className="text-xs text-[#8c91a4]">
                O TetPlayer encontrou um erro inesperado durante a renderização dos componentes.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-[#0a0c13] border border-white/5 rounded-xl p-3 text-left overflow-auto max-h-48 text-[11px] font-mono text-red-300">
                <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-[#8c91a4] whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent,#ef4444)] hover:opacity-90 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar TetPlayer</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex items-center justify-center gap-2 bg-[#1e2333] hover:bg-red-950/40 border border-[#2d344d] hover:border-red-500/30 text-[#8c91a4] hover:text-red-300 font-semibold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
                title="Limpar dados locais temporários e recarregar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
