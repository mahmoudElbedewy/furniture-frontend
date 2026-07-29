import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type ErrorBoundaryProps = {
  children: ReactNode;
  tabLabel?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `AnalyticsDashboard tab crashed${this.props.tabLabel ? ` (${this.props.tabLabel})` : ''}:`,
      error,
      errorInfo,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-8 backdrop-blur-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">
            حدث خطأ في {this.props.tabLabel || 'هذا القسم'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            حصلت مشكلة غير متوقعة أثناء عرض هذا التبويب. باقي أجزاء اللوحة لسه شغالة عادي.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-slate-500 font-mono bg-white/[0.03] rounded-lg px-3 py-2 inline-block max-w-full overflow-x-auto">
              {this.state.error.message}
            </p>
          )}
          <div>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-400 transition-all hover:bg-indigo-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}