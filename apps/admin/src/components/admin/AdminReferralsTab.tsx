import React, { useState } from 'react';
import { User } from '@web/types/user';
import { ledger } from '@web/lib/ledger';
import { formatCurrency } from '@web/lib/utils';
import { Users, ArrowRight, Target, CheckCircle2, Plus } from 'lucide-react';

export const AdminReferralsTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'paid'>('all');

  const users = ledger.getUsers();
  const investorUsers = users.filter(u => u.role !== 'admin');

  const referrals = [
    { id: 'ref-1', referrer: 'Jean Dupont', referee: 'Marie Laurent', status: 'active' as const, reward: 250, paid: false, date: '2026-10-15' },
    { id: 'ref-2', referrer: 'Sophie Martin', referee: 'Thomas Moreau', status: 'pending' as const, reward: 250, paid: false, date: '2026-10-20' },
    { id: 'ref-3', referrer: 'Luc Bernard', referee: 'Camille Petit', status: 'paid' as const, reward: 250, paid: true, date: '2026-10-05' },
    { id: 'ref-4', referrer: 'Alice Roux', referee: 'Julien Simon', status: 'active' as const, reward: 250, paid: false, date: '2026-10-12' },
  ];

  const filteredReferrals = referrals.filter(r => filter === 'all' || r.status === filter);

  const totalPendingRewards = filteredReferrals.filter(r => !r.paid).reduce((sum, r) => sum + r.reward, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center border border-[#182D2A]/30">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#18211F]">Plans &amp; Referrals</h2>
                <p className="text-xs text-[#69736F]">
                  Manage investor referral tiers, track reward attribution, and review pending referral payouts.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Referral Plan</span>
          </button>
        </div>

        {/* Referral Program KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Total Referral Rewards</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{formatCurrency(totalPendingRewards)}</span>
            <span className="text-[10px] text-gray-500 font-bold">Unpaid referral credit</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Active Referrers</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{filteredReferrals.length}</span>
            <span className="text-[10px] text-gray-500 font-bold">Investors with active referrals</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Reward per Referral</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block">€250.00</span>
            <span className="text-[10px] text-emerald-700 font-bold">Per verified referee investment</span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(['all', 'pending', 'active', 'paid'] as const).map(status => (
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

      {/* Referral Activity Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E3E8E3] bg-[#FAFBFA]">
          <h3 className="text-sm font-bold text-[#18211F]">Referral Attribution Log</h3>
          <p className="text-xs text-[#69736F]">Showing {filteredReferrals.length} referral attribution records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F4] text-[#69736F] uppercase text-[10px] font-bold tracking-wider border-b border-[#E3E8E3]">
              <tr>
                <th className="py-4 px-5">Referrer</th>
                <th className="py-4 px-5">Referee</th>
                <th className="py-4 px-5">Reward</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {filteredReferrals.map((r) => {
                const statusColors = {
                  pending: 'bg-amber-50 text-amber-800 border border-amber-200',
                  active: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                  paid: 'bg-blue-50 text-blue-800 border border-blue-200',
                };
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          {r.referrer.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-[#18211F] block">{r.referrer}</span>
                          <span className="text-[10px] text-[#69736F] block">Verified Investor</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block">{r.referee}</span>
                      <span className="text-[10px] text-[#69736F] block">New Sign-up</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-black text-emerald-800 block">{formatCurrency(r.reward)}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[r.status]}`}>
                        {r.status === 'pending' ? 'Pending Verification' : r.status === 'active' ? 'Active' : 'Paid Out'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-[#18211F] block">{r.date}</span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {r.status === 'active' && !r.paid ? (
                        <button
                          onClick={() => {}}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                        >
                          Mark as Paid <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : r.status === 'paid' ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-gray-500">Awaiting Referee Investment</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral Plans Configuration */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-6">
        <div>
          <h3 className="text-lg font-black text-[#18211F]">Referral Commission Plans</h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Configure percentage-based referral commissions paid to referrers when their invited investors make a qualifying token investment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-[#E3E8E3] bg-[#F6F7F4]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-[#18211F] text-sm">Standard Investor Plan</h4>
                <span className="text-[10px] font-bold text-emerald-700">Active · 25 basis points</span>
              </div>
              <button className="text-xs font-bold text-[#182D2A] hover:text-emerald-700 cursor-pointer flex items-center gap-1">
                Edit <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#69736F]">
                <span>Referrer Commission</span>
                <span className="font-bold text-[#18211F]">0.25% of referee investment</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Referee Welcome Bonus</span>
                <span className="font-bold text-[#18211F]">€50 token credit</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Min. Referee Investment</span>
                <span className="font-bold text-[#18211F]">€1,000</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Payout Timing</span>
                <span className="font-bold text-[#18211F]">Upon referee KYC verification</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#E3E8E3] bg-[#F6F7F4]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-[#18211F] text-sm">Institutional Referrer Plan</h4>
                <span className="text-[10px] font-bold text-amber-700">Active · 50 basis points</span>
              </div>
              <button className="text-xs font-bold text-[#182D2A] hover:text-emerald-700 cursor-pointer flex items-center gap-1">
                Edit <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#69736F]">
                <span>Referrer Commission</span>
                <span className="font-bold text-[#18211F]">0.50% of referee investment</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Referee Welcome Bonus</span>
                <span className="font-bold text-[#18211F]">€100 token credit</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Min. Referee Investment</span>
                <span className="font-bold text-[#18211F]">€50,000</span>
              </div>
              <div className="flex justify-between text-[#69736F]">
                <span>Payout Timing</span>
                <span className="font-bold text-[#18211F]">Monthly, per settlement cycle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};