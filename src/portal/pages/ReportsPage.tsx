import React, { useEffect, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { getAuthToken } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalAccountStatement } from '../types';
import { formatEuro, formatShortDate } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const { profile } = usePortal();

  const [statement, setStatement] = useState<PortalAccountStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await portalApi.getAccountStatement();
      setStatement(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load account statement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatement();
  }, []);

  const handleDownloadCsv = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(portalApi.getDistributionsExportUrl('csv'), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Export failed.');
      }
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lagence-distributions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Distribution CSV exported.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to export CSV right now.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !statement) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {error && <ErrorBanner message={error} onRetry={loadStatement} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Account statements &amp; exports</h2>
          <p className="text-sm text-[#8EA7C7] mt-0.5">
            Official year-to-date fiscal statement and rental distribution CSV records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 portal-no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="portal-btn-secondary"
          >
            <Printer className="w-4 h-4" />
            <span>Print statement</span>
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadCsv}
            className="portal-btn-primary"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {statement && (
        <div className="space-y-5">
          <div className="portal-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[#8EA7C7]">Statement ID · <span className="font-mono text-white">{statement.statementId}</span></div>
              <div className="mt-1 text-base font-semibold text-white">
                {profile?.fullName || profile?.email}
              </div>
            </div>
            <div className="text-xs text-[#8EA7C7] portal-tabular">
              Period · {formatShortDate(statement.periodStart)} to {formatShortDate(statement.periodEnd)}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatTile label="Total deposits" value={formatEuro(statement.totalDeposits)} />
            <StatTile label="Total invested" value={formatEuro(statement.totalInvested)} tone="accent" />
            <StatTile label="Dividends received" value={formatEuro(statement.totalDividendsReceived)} tone="positive" />
            <StatTile label="Closing cash balance" value={formatEuro(statement.currentBalance)} />
          </div>
        </div>
      )}
    </div>
  );
};
