import React, { useState } from 'react';
import { Globe, FileText, Palette, FileText as Doc, Users, Clock } from 'lucide-react';

export const AdminWebsiteTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const pages = [
    { id: 'pg-1', name: 'Homepage', path: '/', status: 'published', updated: '2026-10-28', visits: 12400 },
    { id: 'pg-2', name: 'Property Listings', path: '/properties', status: 'published', updated: '2026-10-25', visits: 8900 },
    { id: 'pg-3', name: 'About Us', path: '/about', status: 'published', updated: '2026-10-20', visits: 2300 },
    { id: 'pg-4', name: 'Investor Dashboard', path: '/investor', status: 'published', updated: '2026-10-18', visits: 5600 },
    { id: 'pg-5', name: 'Contact', path: '/contact', status: 'draft', updated: '2026-10-15', visits: 0 },
    { id: 'pg-6', name: 'FAQ', path: '/faq', status: 'archived', updated: '2026-09-30', visits: 150 },
  ];

  const sections = [
    'About', 'Banner content', 'Blog section', 'Breadcrumb', 'Profit calculator', 'Contact',
    'Call to action', 'FAQ', 'Footer', 'How work', 'Links', 'Login', 'Plan', 'Register',
    'Social icon', 'Subscribe section', 'Team member', 'Testimonial', 'Top investor',
    'Transaction section', 'We accept section', 'Why choose us',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center border border-[#182D2A]/30">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#18211F]">Website Pages</h2>
                <p className="text-xs text-[#69736F]">
                  Manage public site pages, template sections, and editorial content blocks across the investor portal.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Doc className="w-4 h-4" />
            <span>Add New Page</span>
          </button>
        </div>

        {/* Website KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Published Pages</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block">{pages.filter(p => p.status === 'published').length}</span>
            <span className="text-[10px] text-emerald-700 font-bold">Live on production</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Total Sections</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{sections.length}</span>
            <span className="text-[10px] text-gray-500 font-bold">Editable template blocks</span>
          </div>
          <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
            <span className="text-[10px] uppercase font-bold text-[#69736F] block tracking-wider">Monthly Visits</span>
            <span className="text-xl font-black text-[#18211F] mt-1 block">{pages.reduce((sum, p) => sum + p.visits, 0).toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 font-bold">Trailing 30 days</span>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(['all', 'published', 'draft', 'archived'] as const).map(status => (
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

      {/* Page Management Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E3E8E3] bg-[#FAFBFA]">
          <h3 className="text-sm font-bold text-[#18211F]">Page Registry</h3>
          <p className="text-xs text-[#69736F]">Showing {pages.length} website pages</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F4] text-[#69736F] uppercase text-[10px] font-bold tracking-wider border-b border-[#E3E8E3]">
              <tr>
                <th className="py-4 px-5">Page</th>
                <th className="py-4 px-5">Path</th>
                <th className="py-4 px-5">Visits</th>
                <th className="py-4 px-5">Last Updated</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E3]">
              {pages.filter(p => filter === 'all' || p.status === filter).map((p) => {
                const statusColors = {
                  published: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                  draft: 'bg-amber-50 text-amber-800 border border-amber-200',
                  archived: 'bg-gray-50 text-gray-800 border border-gray-200',
                };
                return (
                  <tr key={p.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#18211F] block">{p.name}</span>
                      <span className="text-[10px] text-[#69736F] block">{p.path}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-black text-emerald-800 block">{p.visits.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-[#18211F] block">{p.updated}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(statusColors as Record<string, string>)[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {}}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        Edit <Globe className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Sections */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-6">
        <div>
          <h3 className="text-lg font-black text-[#18211F]">Editable Template Sections</h3>
          <p className="text-xs text-[#69736F] mt-0.5">
            Reusable content blocks that compose the public site pages: About, Banner, Footer, Login, Register, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sections.map((section, i) => (
            <div key={section} className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] flex items-center gap-2 cursor-pointer hover:bg-[#E3E8E3] transition-colors">
              <Palette className="w-4 h-4 text-[#69736F]" />
              <span className="text-xs font-semibold text-[#18211F] truncate">{section}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};