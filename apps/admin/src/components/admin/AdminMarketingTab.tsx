import React, { useState } from 'react';
import { Sparkles, FileText, Users, Globe, Palette, Clock, Target, Plus } from 'lucide-react';

export const AdminMarketingTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'paused'>('all');

  const campaigns = [
    { id: 'camp-1', name: 'Winter Luxury Launch', type: 'Email Campaign', status: 'active', reach: 1240, conversions: 89, roi: '14.2%' },
    { id: 'camp-2', name: 'Château d\'Armainvilliers Teaser', type: 'Social Media', status: 'scheduled', reach: 0, conversions: 0, roi: '—' },
    { id: 'camp-3', name: 'Referral Program Q4 Push', type: 'Referral', status: 'active', reach: 856, conversions: 34, roi: '22.1%' },
    { id: 'camp-4', name: 'Institutional HNWI Outreach', type: 'Direct Mail', status: 'paused', reach: 0, conversions: 0, roi: '—' },
  ];

  const subscribers = [
    { id: 'sub-1', email: 'investor.paris@example.com', source: 'Website Signup', subscribed: '2026-10-28', status: 'active' },
    { id: 'sub-2', email: 'family.office.london@example.com', source: 'Property Inquiry', subscribed: '2026-10-25', status: 'active' },
    { id: 'sub-3', email: 'wealth.manager.geneva@example.com', source: 'Referral', subscribed: '2026-10-20', status: 'active' },
    { id: 'sub-4', email: 'crypto.investor.miami@example.com', source: 'Webinar', subscribed: '2026-10-15', status: 'unsubscribed' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200/60">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#18211F]">Marketing</h2>
                <p className="text-xs text-[#69736F]">
                  Manage campaign performance, subscriber growth, and multilingual content for global investor acquisition.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Marketing KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Active Campaigns</span>
            <span className="text-xl font-black text-purple-800 mt-1 block">{campaigns.filter(c => c.status === 'active').length}</span>
            <span className="text-[10px] text-purple-700 font-bold">Currently running</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Total Subscribers</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{subscribers.length}</span>
            <span className="text-[10px] text-gray-500 font-bold">Mailing list contacts</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Avg. Campaign ROI</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block">14.2%</span>
            <span className="text-[10px] text-emerald-700 font-bold">Weighted across active</span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(['all', 'active', 'scheduled', 'paused'] as const).map(status => (
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

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E3E8E3] bg-[#FAFBFA]">
          <h3 className="text-sm font-bold text-[#18211F]">Campaign Performance</h3>
          <p className="text-xs text-[#69736F]">Showing {campaigns.length} marketing campaigns</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F4] text-[#69736F] uppercase text-[10px] font-bold tracking-wider border-b border-[#E3E8E3]">
              <tr>
                <th className="py-4 px-5">Campaign</th>
                <th className="py-4 px-5">Channel</th>
                <th className="py-4 px-5">Reach</th>
                <th className="py-4 px-5">Conversions</th>
                <th className="py-4 px-5">ROI</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {campaigns.map((c) => {
                const statusColors = {
                  active: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                  scheduled: 'bg-blue-50 text-blue-800 border border-blue-200',
                  paused: 'bg-gray-50 text-gray-800 border border-gray-200',
                };
                return (
                  <tr key={c.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block">{c.name}</span>
                      <span className="text-[10px] text-[#69736F] block">{c.type}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block">{c.reach.toLocaleString()}</span>
                      <span className="text-[10px] text-[#69736F] block">Impressions / Views</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-emerald-800 block">{c.conversions}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`font-bold text-${c.roi === '—' ? 'gray-500' : 'emerald-800'} block`}>{c.roi}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(statusColors as Record<string, string>)[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {}}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        Manage <Target className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscriber Management */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#18211F]">Subscriber List</h3>
            <p className="text-xs text-[#69736F] mt-0.5">Global mailing list contacts and subscription status.</p>
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-colors cursor-pointer border border-[#DCE4DA] flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Import List</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F4] text-[#69736F] uppercase text-[10px] font-bold tracking-wider border-b border-[#E3E8E3]">
              <tr>
                <th className="py-4 px-5">Email</th>
                <th className="py-4 px-5">Source</th>
                <th className="py-4 px-5">Subscribed</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {subscribers.map((s) => {
                return (
                  <tr key={s.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block">{s.email}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-[10px] text-[#18211F] font-medium block">{s.source}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-[#18211F] block">{s.subscribed}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {}}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};