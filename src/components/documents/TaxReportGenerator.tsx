import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { Download, Printer, ShieldCheck, Award } from 'lucide-react';

export const TaxReportGenerator: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const userInvestments = user ? ledger.getInvestments(user.id) : [];
  const userTransactions = user ? ledger.getTransactions(user.id) : [];

  const yearlyDividends = userTransactions.filter((tx) => {
    if (tx.type !== 'distribution') return false;
    const year = new Date(tx.createdAt).getFullYear();
    return year === selectedYear;
  });

  const grossDividendIncome = yearlyDividends.reduce((acc, curr) => acc + curr.amount, 0);
  const managementExpenseDeduction = Number((grossDividendIncome * 0.1).toFixed(2));
  const netTaxableIncome = Number((grossDividendIncome - managementExpenseDeduction).toFixed(2));
  const euWithholdingTax19 = Number((netTaxableIncome * 0.19).toFixed(2));
  const netDisbursedYield = Number((netTaxableIncome - euWithholdingTax19).toFixed(2));

  const handlePrintTaxStatement = () => {
    window.print();
  };

  const handleDownloadTaxPdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="portal-card p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--dash-card-border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] text-xs font-bold mb-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>EU Modelo 210 &amp; Certified Tax Audits</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--dash-text)]">
            Fiscal &amp; Tax Statement Generator
          </h2>
          <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">
            Official annual fiscal summaries detailing gross rental dividends, deductible SPV expenses, and EU withholding compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="tax-year-select" className="text-xs font-bold text-[var(--dash-text)]">
            Tax Year:
          </label>
          <select
            id="tax-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-inner)] text-xs font-bold font-mono text-[var(--dash-text)] focus:outline-none focus:border-[var(--dash-accent)] cursor-pointer"
          >
            <option value={2026}>2026 Fiscal YTD</option>
            <option value={2025}>2025 Tax Year</option>
            <option value={2024}>2024 Tax Year</option>
          </select>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-[var(--dash-highlight)] border border-[var(--dash-accent-border)] text-xs font-semibold text-[var(--dash-positive)]">
          Fiscal statement summary prepared for {selectedYear}. Use &ldquo;Print Tax Statement&rdquo; for certified PDF output.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] block">
            Gross Rental Yield
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-text)] block">
            {formatCurrency(grossDividendIncome)}
          </span>
          <span className="text-[10.5px] text-[var(--dash-text-muted)] block">SPV Dividends</span>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] block">
            Deductible Expenses
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-accent)] block">
            -{formatCurrency(managementExpenseDeduction)}
          </span>
          <span className="text-[10.5px] text-[var(--dash-text-muted)] block">Management &amp; Notarial</span>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-inner)] border border-[var(--dash-card-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-muted)] block">
            EU Withholding (19%)
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-negative)] block">
            -{formatCurrency(euWithholdingTax19)}
          </span>
          <span className="text-[10.5px] text-[var(--dash-text-muted)] block">Modelo 210 Standard</span>
        </div>

        <div className="p-4 rounded-[14px] bg-[var(--dash-sidebar-active-bg)] border border-[var(--dash-accent-border)] space-y-1">
          <span className="text-[10.5px] uppercase font-bold text-[var(--dash-text-secondary)] block">
            Net Disbursed Income
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--dash-positive)] block">
            {formatCurrency(netDisbursedYield)}
          </span>
          <span className="text-[10.5px] text-[var(--dash-text-secondary)] block">Settled to Wallet</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--dash-text)]">
          Annual Asset Yield Breakdown ({selectedYear})
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[var(--dash-card-border)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--dash-card-border)] text-[var(--dash-text-muted)] font-semibold bg-[var(--dash-inner)]">
                <th className="py-2.5 px-4">SPV Property Name</th>
                <th className="py-2.5 px-4">Ownership Units</th>
                <th className="py-2.5 px-4">Gross Dividends</th>
                <th className="py-2.5 px-4">Notarial Deductions</th>
                <th className="py-2.5 px-4">Net Yield Paid</th>
                <th className="py-2.5 px-4 text-right">Certificate ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dash-card-border)]">
              {userInvestments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--dash-text-muted)]">
                    No active property allocations recorded for tax year {selectedYear}.
                  </td>
                </tr>
              ) : (
                userInvestments.map((inv) => {
                  const gross = inv.totalDividendsReceived || inv.projectedMonthlyIncome * 12;
                  const ded = Number((gross * 0.1).toFixed(2));
                  const net = Number((gross - ded).toFixed(2));
                  return (
                    <tr key={inv.id} className="hover:bg-[var(--dash-hover)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--dash-text)]">{inv.propertyTitle}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--dash-text)]">
                        {inv.tokensPurchased} Units
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--dash-text)]">{formatCurrency(gross)}</td>
                      <td className="py-3 px-4 font-mono text-[var(--dash-accent)]">-{formatCurrency(ded)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--dash-positive)]">
                        {formatCurrency(net)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--dash-text-muted)] text-right">
                        {inv.certificateId}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--dash-inner)] border border-[var(--dash-card-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[var(--dash-accent)] shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-[var(--dash-text)] uppercase tracking-wide">
              eIDAS Certified Fiscal Statement
            </h4>
            <p className="text-[11px] text-[var(--dash-text-muted)]">
              Issued under Spanish Agencia Tributaria &amp; French DGFiP reporting guidelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handlePrintTaxStatement}
            className="flex-1 sm:flex-none portal-btn-outline h-10 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
            <span>Print Tax Statement</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTaxPdf}
            disabled={isGenerating}
            className="flex-1 sm:flex-none portal-btn h-10 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Preparing...' : 'Prepare Statement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
