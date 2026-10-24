import React, { useState, useEffect } from 'react';
import {
  getFrontendErrors,
  clearFrontendErrors,
  downloadFrontendErrorsFile,
  FrontendErrorEntry,
  logFrontendError
} from '../../lib/errorLogger';
import {
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Check,
  Copy,
  Eye,
  X,
  Bug,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Laptop
} from 'lucide-react';

export const AdminFrontendErrorLogView: React.FC = () => {
  const [errors, setErrors] = useState<FrontendErrorEntry[]>(() => getFrontendErrors());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<FrontendErrorEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshLogs = () => {
    setErrors(getFrontendErrors());
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNewError = () => {
      refreshLogs();
      setNotice('New client-side error recorded in localStorage buffer.');
      setTimeout(() => setNotice(null), 3000);
    };

    const handleCleared = () => {
      refreshLogs();
    };

    window.addEventListener('kretz:frontend-error-logged', handleNewError);
    window.addEventListener('kretz:frontend-error-cleared', handleCleared);

    return () => {
      window.removeEventListener('kretz:frontend-error-logged', handleNewError);
      window.removeEventListener('kretz:frontend-error-cleared', handleCleared);
    };
  }, []);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the local frontend error buffer?')) {
      clearFrontendErrors();
      refreshLogs();
      setNotice('Frontend error buffer cleared.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSimulateTestError = () => {
    try {
      throw new Error(`Test frontend exception triggered at ${new Date().toLocaleTimeString()} by administrator`);
    } catch (err: any) {
      logFrontendError(err, { componentStack: '\n    at AdminFrontendErrorLogView (src/components/admin/AdminFrontendErrorLogView.tsx:82)\n    at AdminPanel (src/components/admin/AdminPanel.tsx)' });
      refreshLogs();
      setNotice('Test error generated and logged into the persistent buffer.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const filteredErrors = errors.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Bug className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Frontend Client Error Buffer
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {errors.length} {errors.length === 1 ? 'Error' : 'Errors'} Recorded
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time client-side error telemetry logged by the ErrorBoundary to persistent browser storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateTestError}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Generate a harmless test error to verify logging"
          >
            Trigger Test Error
          </button>

          <button
            onClick={refreshLogs}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Refresh error list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={downloadFrontendErrorsFile}
            disabled={errors.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[#10221E] hover:bg-[#182C27] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleClear}
            disabled={errors.length === 0}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Buffer</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by error message, incident ID, route, or error name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Error Table / Cards */}
      {filteredErrors.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {errors.length === 0 ? 'No Frontend Errors Recorded' : 'No Errors Match Search Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {errors.length === 0
              ? 'The client application is operating without unhandled React errors.'
              : 'Try clearing your search query to see all logged incidents.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredErrors.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono font-bold text-[10px]">
                      {item.name}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {item.id}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900 break-words leading-relaxed text-sm">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      {item.pathname || item.url}
                    </span>
                    <span className="flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-slate-400" />
                      {item.viewport}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleCopy(item.id, JSON.stringify(item, null, 2))}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Copy JSON representation"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedError(item)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 text-left overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Frontend Diagnostic Stack
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedError.id} · {selectedError.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Message
                </span>
                <p className="font-semibold text-slate-900 text-sm">
                  {selectedError.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Timestamp:</span>
                  <span className="font-mono text-slate-700">{selectedError.timestamp}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Viewport Size:</span>
                  <span className="font-mono text-slate-700">{selectedError.viewport}</span>
                </div>
              </div>

              {selectedError.stack && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Call Stack:
                  </span>
                  <pre className="bg-slate-900 text-rose-300 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-normal">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.componentStack && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    React Component Hierarchy:
                  </span>
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-normal">
                    {selectedError.componentStack}
                  </pre>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  User Agent:
                </span>
                <p className="text-slate-500 font-mono text-[11px] break-all bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {selectedError.userAgent}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleCopy(selectedError.id, JSON.stringify(selectedError, null, 2))}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedId === selectedError.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
