import React, { useCallback, useEffect, useState } from 'react';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { Download, FileText, Printer } from 'lucide-react';
import { getAuthToken } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalAccountStatement, PortalUploadedDocument } from '../types';
import { formatEuro, formatShortDate } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const { profile, transactions, sampleDataEnabled, sampleDataset, navigatePortal } = usePortal();

  const [statement, setStatement] = useState<PortalAccountStatement | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<PortalUploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    if (sampleDataEnabled) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, docs] = await Promise.all([
        portalApi.getAccountStatement(),
        portalApi.getStatements().catch(() => [] as PortalUploadedDocument[]),
      ]);
      setStatement(data);
      setUploadedDocs(docs);
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Unable to load statements and tax documents.'));
    } finally {
      setLoading(false);
    }
  }, [sampleDataEnabled]);

  useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  const effectiveStatement =
    sampleDataEnabled && sampleDataset ? sampleDataset.statement : statement;

  const triggerTextDownload = (filename: string, content: string, mime = 'text/plain;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadStatement = () => {
    if (!effectiveStatement) return;
    setDownloading('statement');
    try {
      const lines = [
        'L’AGENCE INVESTOR PORTAL — ACCOUNT STATEMENT',
        `Statement ID: ${effectiveStatement.statementId}`,
        `Investor: ${profile?.fullName || profile?.email || 'Registered Investor'}`,
        `Period: ${formatShortDate(effectiveStatement.periodStart)} to ${formatShortDate(effectiveStatement.periodEnd)}`,
        '',
        `Total Deposits: ${formatEuro(effectiveStatement.totalDeposits)}`,
        `Total Invested: ${formatEuro(effectiveStatement.totalInvested)}`,
        `Distributions Received: ${formatEuro(effectiveStatement.totalDividendsReceived)}`,
        `Closing Cash Balance: ${formatEuro(effectiveStatement.currentBalance)}`,
      ].join('\n');
      triggerTextDownload(`lagence-statement-${effectiveStatement.statementId}.txt`, lines);
      toast.success('Account statement downloaded.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadTaxSummary = () => {
    if (!effectiveStatement) return;
    setDownloading('tax');
    try {
      const year = new Date(effectiveStatement.periodEnd || Date.now()).getFullYear();
      const lines = [
        `L’AGENCE — ANNUAL TAX & DISTRIBUTION SUMMARY (${year})`,
        `Investor: ${profile?.fullName || profile?.email || 'Registered Investor'}`,
        `Tax ID (NIF / TIN): ${profile?.taxId || 'Not specified'}`,
        `Reporting Period: ${formatShortDate(effectiveStatement.periodStart)} to ${formatShortDate(effectiveStatement.periodEnd)}`,
        '',
        `Gross Rental Distributions Settled: ${formatEuro(effectiveStatement.totalDividendsReceived)}`,
        `Capital Deployed (Period): ${formatEuro(effectiveStatement.totalInvested)}`,
        `Closing Wallet Cash: ${formatEuro(effectiveStatement.currentBalance)}`,
      ].join('\n');
      triggerTextDownload(`lagence-tax-summary-${year}.txt`, lines);
      toast.success('Annual tax summary downloaded.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCsv = async () => {
    if (downloading) return;
    setDownloading('csv');
    try {
      if (sampleDataEnabled && sampleDataset) {
        const csvLines = [
          'Date,Reference,Property,Type,Amount EUR,Status',
          ...sampleDataset.transactions
            .filter((t) => t.type.toLowerCase() === 'dividend')
            .map(
              (t) =>
                `${t.createdAt.slice(0, 10)},${t.reference},"${t.propertyTitle || 'Portfolio'}",${t.type},${t.amount},${t.status}`
            ),
        ].join('\n');
        triggerTextDownload(
          `lagence-sample-tax-distributions-${new Date().toISOString().slice(0, 10)}.csv`,
          csvLines,
          'text/csv;charset=utf-8;'
        );
        toast.success('Sample distribution tax CSV downloaded.');
        return;
      }

      const token = getAuthToken();
      const res = await fetch(portalApi.getDistributionsExportUrl('csv'), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Export failed.');
      }
      const csvText = await res.text();
      triggerTextDownload(
        `lagence-tax-distributions-${new Date().toISOString().slice(0, 10)}.csv`,
        csvText,
        'text/csv;charset=utf-8;'
      );
      toast.success('Distribution tax CSV downloaded.');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Unable to download tax CSV right now.'));
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadUploadedDoc = (doc: PortalUploadedDocument) => {
    setDownloading(doc.id);
    try {
      if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = doc.fileDataUrl;
        a.download = doc.fileName || `${doc.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`${doc.title} downloaded.`);
        return;
      }
      const summary = [
        'L’AGENCE INVESTOR PORTAL — OFFICIAL DOCUMENT RECORD',
        `Document ID: ${doc.id}`,
        `Category: ${doc.category === 'tax_document' ? 'Annual Tax Document' : 'Account Statement'}`,
        `Title: ${doc.title}`,
        doc.taxYear ? `Tax Year: ${doc.taxYear}` : '',
        doc.periodLabel ? `Period: ${doc.periodLabel}` : '',
        `Investor: ${profile?.fullName || profile?.email || doc.userEmail || 'Registered Investor'}`,
        `Issued Date: ${formatShortDate(doc.uploadedAt)}`,
        `File Name: ${doc.fileName}`,
      ]
        .filter(Boolean)
        .join('\n');
      triggerTextDownload(
        doc.fileName.endsWith('.txt') ? doc.fileName : `${doc.fileName}.txt`,
        summary
      );
      toast.success(`${doc.title} downloaded.`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !sampleDataEnabled && !effectiveStatement) {
    return <LoadingSkeleton rows={3} />;
  }

  const effectiveUploadedDocs = sampleDataEnabled ? [] : uploadedDocs;

  const hasActivity =
    effectiveUploadedDocs.length > 0 ||
    transactions.length > 0 ||
    Boolean(
      effectiveStatement &&
        (effectiveStatement.totalDeposits > 0 ||
          effectiveStatement.totalInvested > 0 ||
          effectiveStatement.totalDividendsReceived > 0 ||
          effectiveStatement.currentBalance > 0)
    );

  return (
    <div className="max-w-4xl space-y-6">
      {error && !sampleDataEnabled && <ErrorBanner message={error} onRetry={loadStatement} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Reports</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Downloadable account statements and annual tax documents.
          </p>
        </div>

        {hasActivity && (
          <button
            type="button"
            onClick={() => window.print()}
            className="portal-btn-secondary portal-no-print self-start"
          >
            <Printer className="w-4 h-4" />
            <span>Print summary</span>
          </button>
        )}
      </div>

      {!hasActivity ? (
        <EmptyState
          icon={<FileText className="w-5 h-5" />}
          title="No statements or tax documents yet"
          description="Your downloadable account statements and annual distribution tax documents will appear here once you complete your first deposit or investment."
          actionLabel="Explore properties"
          onAction={() => navigatePortal('explore')}
        />
      ) : (
        <div className="space-y-6">
          {effectiveStatement && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatTile label="Total deposits" value={formatEuro(effectiveStatement.totalDeposits)} />
              <StatTile
                label="Total invested"
                value={formatEuro(effectiveStatement.totalInvested)}
                tone="accent"
              />
              <StatTile
                label="Distributions received"
                value={formatEuro(effectiveStatement.totalDividendsReceived)}
                tone="positive"
              />
              <StatTile label="Closing balance" value={formatEuro(effectiveStatement.currentBalance)} />
            </div>
          )}

          {effectiveUploadedDocs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F2F5F4]">Issued statements &amp; tax documents</h3>
              <div className="portal-card-list divide-y divide-[#1F2C33]">
                {effectiveUploadedDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#F2F5F4]">{doc.title}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#142026] text-[#6FD8B0] border border-[#1F2C33]">
                          {doc.category === 'tax_document' ? 'Tax Document' : 'Statement'}
                        </span>
                      </div>
                      <div className="text-xs text-[#8FA1A8] mt-0.5 portal-tabular">
                        {doc.periodLabel || (doc.taxYear ? `Tax year ${doc.taxYear}` : 'Official issue')} · Issued {formatShortDate(doc.uploadedAt)} · <span className="font-mono">{doc.fileName}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={downloading === doc.id}
                      onClick={() => handleDownloadUploadedDoc(doc)}
                      className="portal-btn-primary shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloading === doc.id ? 'Downloading...' : 'Download'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {effectiveStatement && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#F2F5F4]">Automated ledger exports</h3>
              <div className="portal-card-list divide-y divide-[#1F2C33]">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F2F5F4]">
                      Account statement · <span className="font-mono">{effectiveStatement.statementId}</span>
                    </div>
                    <div className="text-xs text-[#8FA1A8] mt-0.5 portal-tabular">
                      {formatShortDate(effectiveStatement.periodStart)} to{' '}
                      {formatShortDate(effectiveStatement.periodEnd)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={downloading === 'statement'}
                    onClick={handleDownloadStatement}
                    className="portal-btn-secondary shrink-0"
                  >
                    <Download className="w-4 h-4 text-[#6FD8B0]" />
                    <span>{downloading === 'statement' ? 'Preparing...' : 'Download'}</span>
                  </button>
                </div>

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F2F5F4]">
                      Annual tax summary ({new Date(effectiveStatement.periodEnd || Date.now()).getFullYear()})
                    </div>
                    <div className="text-xs text-[#8FA1A8] mt-0.5">
                      Fiscal year rental income &amp; withholding summary
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={downloading === 'tax'}
                    onClick={handleDownloadTaxSummary}
                    className="portal-btn-secondary shrink-0"
                  >
                    <Download className="w-4 h-4 text-[#6FD8B0]" />
                    <span>{downloading === 'tax' ? 'Preparing...' : 'Download'}</span>
                  </button>
                </div>

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F2F5F4]">
                      Distribution tax ledger (CSV)
                    </div>
                    <div className="text-xs text-[#8FA1A8] mt-0.5">
                      Itemized rental payout schedule for tax filing
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={downloading === 'csv'}
                    onClick={() => void handleDownloadCsv()}
                    className="portal-btn-primary shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloading === 'csv' ? 'Downloading...' : 'Download CSV'}</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
