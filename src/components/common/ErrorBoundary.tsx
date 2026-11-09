import React from 'react';
import { AlertTriangle, RefreshCw, Download, Copy, Check, ChevronDown, ChevronUp, ShieldAlert, Trash2 } from 'lucide-react';
import { logFrontendError, downloadFrontendErrorsFile, FrontendErrorEntry } from '../../lib/errorLogger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  lastLoggedEntry: FrontendErrorEntry | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    lastLoggedEntry: null,
    showDetails: false,
    copied: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught frontend rendering error:', error, errorInfo);
    
    // Automatically log error to persistent localStorage buffer
    const entry = logFrontendError(error, errorInfo);
    this.setState({ errorInfo, lastLoggedEntry: entry });
  }

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    };

    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2)).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
  };

  handleHardReset = () => {
    try {
      sessionStorage.clear();
      // Remove possible broken state without deleting authentication credentials
      localStorage.removeItem('desktop_mode_active');
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, copied, lastLoggedEntry } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] text-[#0F172A]">
          <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-xl text-left space-y-6">
            
            {/* Header with icon & badge */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Frontend Exception Captured</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                    Application Rendering Notice
                  </h1>
                </div>
              </div>
            </div>

            {/* Error message card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Error Message
              </span>
              <p className="text-xs sm:text-sm font-semibold text-rose-950 font-mono break-words leading-relaxed">
                {error?.message || 'An unexpected rendering condition occurred in the client application.'}
              </p>
              {lastLoggedEntry && (
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  Incident ID: {lastLoggedEntry.id} · Logged to local buffer
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This error was captured and recorded into the persistent local diagnostic buffer. You can reload the page, export the diagnostic log for technical review, or copy the error details.
            </p>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl bg-[#10221E] hover:bg-[#182C27] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={() => downloadFrontendErrorsFile()}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                title="Download all logged frontend errors as JSON"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Error Log (.json)</span>
              </button>
            </div>

            {/* Secondary Controls: Copy Diagnostics & Technical Details */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={this.handleCopyDetails}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Diagnostics Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Diagnostic Details</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={this.handleHardReset}
                  className="text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 hover:underline cursor-pointer"
                  title="Clear temporary session data and return to Home"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset Session &amp; Go Home</span>
                </button>

                <button
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>{showDetails ? 'Hide Stack' : 'View Stack'}</span>
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expandable Technical Diagnostics Accordion */}
            {showDetails && (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-[11px] font-mono overflow-x-auto space-y-3 animate-in fade-in duration-200 max-h-64 overflow-y-auto">
                <div>
                  <div className="text-slate-400 font-bold mb-1">Stack Trace:</div>
                  <pre className="text-rose-300 whitespace-pre-wrap break-all leading-normal">
                    {error?.stack || 'No stack trace captured.'}
                  </pre>
                </div>
                {errorInfo?.componentStack && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-slate-400 font-bold mb-1">Component Hierarchy:</div>
                    <pre className="text-slate-300 whitespace-pre-wrap break-all leading-normal">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
