import React, { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, ArrowRight, User, Search, Mail, Target } from 'lucide-react';

export const AdminSupportTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered' | 'closed'>('all');

  const tickets = [
    { id: 'TK-1289', subject: 'Deposit not reflected in wallet balance', customer: 'Marie Laurent', email: 'marie.laurent@example.com', status: 'pending' as const, priority: 'high', created: '2026-10-28', answer: '' },
    { id: 'TK-1290', subject: 'KYC document rejection - passport scan unclear', customer: 'Thomas Moreau', email: 'thomas.moreau@example.com', status: 'answered' as const, priority: 'medium', created: '2026-10-27', answer: 'Please upload a higher-resolution passport scan with all four corners visible.' },
    { id: 'TK-1291', subject: 'Withdrawal payout delay > 5 business days', customer: 'Jean Dupont', email: 'jean.dupont@example.com', status: 'closed' as const, priority: 'high', created: '2026-10-25', answer: 'Wire transfer executed on 2026-10-27. Funds should arrive within 1-2 business days.' },
    { id: 'TK-1292', subject: 'Property investment certificate download error', customer: 'Sophie Martin', email: 'sophie.martin@example.com', status: 'pending' as const, priority: 'medium', created: '2026-10-24', answer: '' },
    { id: 'TK-1293', subject: 'Referral commission not credited', customer: 'Luc Bernard', email: 'luc.bernard@example.com', status: 'pending' as const, priority: 'low', created: '2026-10-22', answer: '' },
  ];

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  const statusColors = {
    pending: 'bg-amber-50 text-amber-800 border border-amber-200',
    answered: 'bg-blue-50 text-blue-800 border border-blue-200',
    closed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  };

  const priorityColors = {
    high: 'bg-red-50 text-red-800 border border-red-200',
    medium: 'bg-amber-50 text-amber-800 border border-amber-200',
    low: 'bg-gray-50 text-gray-800 border border-gray-200',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center border border-[#182D2A]/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#18211F]">Support &amp; Reports</h2>
                <p className="text-xs text-[#69736F]">
                  Manage investor support tickets, review compliance reports, and track resolution SLAs.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Broadcast Reply</span>
          </button>
        </div>

        {/* Support KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Total Tickets</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{tickets.length}</span>
            <span className="text-[10px] text-gray-500 font-bold">All support cases</span>
          </div>
          <div className={`p-5 rounded-2xl border ${pendingCount > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-[#E3E8E3] bg-[#F6F7F4]'}`}>
            <span className={`text-[10px] uppercase font-bold ${pendingCount > 0 ? 'text-amber-900' : 'text-[#69736F]'} block tracking-wider`}>Pending Tickets</span>
            <span className={`text-xl font-black ${pendingCount > 0 ? 'text-amber-950' : 'text-[#18211F]'} mt-1 block`}>{pendingCount}</span>
            <span className="text-[10px] text-gray-500 font-bold">Awaiting agent response</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Answered</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block">{tickets.filter(t => t.status === 'answered').length}</span>
            <span className="text-[10px] text-emerald-700 font-bold">Resolved by support</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Closed</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{tickets.filter(t => t.status === 'closed').length}</span>
            <span className="text-[10px] text-gray-500 font-bold">Case resolved &amp; archived</span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(['all', 'pending', 'answered', 'closed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filter === status
                  ? 'bg-[#182D2A] text-white border-[#182D2A] shadow-xs'
                  : 'bg-white text-[#69736F] border-[#E3E8E3] hover:text-[#18211F] hover:bg-[#F6F7F4]'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Support Ticket Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E3E8E3] bg-[#FAFBFA]">
          <h3 className="text-sm font-bold text-[#18211F]">Support Ticket Log</h3>
          <p className="text-xs text-[#69736F]">Showing {filteredTickets.length} of {tickets.length} support cases</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F4] text-[#69736F] uppercase text-[10px] font-bold tracking-wider border-b border-[#E3E8E3]">
              <tr>
                <th className="py-4 px-5">Ticket ID</th>
                <th className="py-4 px-5">Subject</th>
                <th className="py-4 px-5">Customer</th>
                <th className="py-4 px-5">Priority</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Created</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {filteredTickets.map((t) => {
                return (
                  <tr key={t.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-[#18211F] block">{t.id}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block truncate max-w-xs">{t.subject}</span>
                      <span className="text-[10px] text-[#69736F] block truncate max-w-xs">{t.answer || 'No response yet'}</span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px]">
                          {t.customer.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-[#18211F] block">{t.customer}</span>
                          <span className="text-[10px] text-[#69736F] font-mono block">{t.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(priorityColors as Record<string, string>)[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[t.status]}`}>
                        {t.status === 'pending' ? 'Pending Review' : t.status === 'answered' ? 'Answered' : 'Closed'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-[#18211F] block">{t.created}</span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {}}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        View Ticket <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Exports */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-6">
        <div>
          <h3 className="text-lg font-black text-[#18211F]">Compliance &amp; Activity Reports</h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Export structured audit logs and activity reports for regulatory review and internal compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[#E3E8E3] flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-[#18211F] text-sm">Transaction Ledger Log</h4>
              <p className="text-[10px] text-[#69736F] mt-1">Full immutable ledger of deposits, withdrawals, investments, and distributions.</p>
            </div>
            <button
              className="mt-4 px-3 py-2 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-[#DCE4DA]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-[#E3E8E3] flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-[#18211F] text-sm">Investor Plan Activity</h4>
              <p className="text-[10px] text-[#69736F] mt-1">Referral plan activity, token purchases, and commission attributions.</p>
            </div>
            <button
              className="mt-4 px-3 py-2 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-[#DCE4DA]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-[#E3E8E3] flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-[#18211F] text-sm">Commission Attribution</h4>
              <p className="text-[10px] text-[#69736F] mt-1">Referrer commission payouts and referee welcome bonus distribution.</p>
            </div>
            <button
              className="mt-4 px-3 py-2 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-[#DCE4DA]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};