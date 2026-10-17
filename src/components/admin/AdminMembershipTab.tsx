import React, { useState } from 'react';
import { UserMembership, MembershipTier, MembershipApplication, MembershipTierId } from '../../types/membership';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  Crown, Users, ShieldCheck, CheckCircle2, XCircle, 
  Sparkles, Search, Filter, Plus, ArrowUpRight, 
  Settings, Edit3, Trash2, Check, AlertCircle, RefreshCw
} from 'lucide-react';

export const AdminMembershipTab: React.FC = () => {
  const [memberships, setMemberships] = useState<UserMembership[]>(() => ledger.getMemberships());
  const [tiers, setTiers] = useState<MembershipTier[]>(() => ledger.getMembershipTiers());
  const [applications, setApplications] = useState<MembershipApplication[]>(() => ledger.getMembershipApplications());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Grant Complimentary Member Form State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantName, setGrantName] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantTier, setGrantTier] = useState<MembershipTierId>('sovereign');
  const [grantCycle, setGrantCycle] = useState<'annual' | 'monthly'>('annual');
  const [grantNotes, setGrantNotes] = useState('Executive Board Complimentary Allocation');

  // Tier Editing State
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [editAnnualPrice, setEditAnnualPrice] = useState<number>(0);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0);

  // Status message
  const [message, setMessage] = useState<string | null>(null);

  const refreshData = () => {
    setMemberships(ledger.getMemberships());
    setTiers(ledger.getMembershipTiers());
    setApplications(ledger.getMembershipApplications());
  };

  const handleGrantMembership = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantName.trim() || !grantEmail.trim()) return;

    try {
      ledger.subscribeMembership({
        userId: 'usr-grant-' + Math.random().toString(36).substring(2, 8),
        userEmail: grantEmail,
        userName: grantName,
        tierId: grantTier,
        billingCycle: grantCycle,
        paymentMethod: 'complimentary_invitation',
        specialRequests: grantNotes,
        preferredRegion: 'Spain & International',
      });

      setShowGrantModal(false);
      setGrantName('');
      setGrantEmail('');
      setMessage(`Granted complimentary ${grantTier} membership to ${grantEmail}!`);
      refreshData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleUpdateTierConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    const updated: MembershipTier = {
      ...editingTier,
      priceAnnual: Number(editAnnualPrice),
      priceMonthly: Number(editMonthlyPrice),
    };

    ledger.updateMembershipTierConfig(updated);
    setEditingTier(null);
    setMessage(`Updated pricing for ${updated.name}!`);
    refreshData();
  };

  const handleApproveApplication = (appId: string) => {
    ledger.reviewMembershipApplication(appId, 'approved', 'Approved by platform administrator');
    setMessage('Application approved and member pass issued.');
    refreshData();
  };

  const handleRejectApplication = (appId: string) => {
    ledger.reviewMembershipApplication(appId, 'rejected', 'Declined by compliance');
    setMessage('Application rejected.');
    refreshData();
  };

  const handleToggleAutoRenew = (memId: string, current: boolean) => {
    ledger.adminUpdateUserMembership(memId, { autoRenew: !current });
    setMessage('Updated auto-renewal policy.');
    refreshData();
  };

  const handleRevoke = (memId: string) => {
    ledger.adminUpdateUserMembership(memId, { status: 'cancelled', autoRenew: false });
    setMessage('Membership cancelled.');
    refreshData();
  };

  const filteredMembers = memberships.filter((m) => {
    const matchesSearch = 
      !searchQuery.trim() ||
      m.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || m.tierId === tierFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesTier && matchesStatus;
  });

  // Calculate KPIs
  const activeMembers = memberships.filter(m => m.status === 'active');
  const totalAnnualizedRevenue = activeMembers.reduce((sum, m) => {
    return sum + (m.billingCycle === 'annual' ? m.feePaid : m.feePaid * 12);
  }, 0);

  return (
    <div className="space-y-8 text-left">
      
      {/* Toast Feedback */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Active Members</p>
          <p className="text-2xl font-black text-[#18211F] mt-1">{activeMembers.length}</p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">Live verified passes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Annualized Member Dues</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{formatCurrency(totalAnnualizedRevenue)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Projected recurring revenue</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">VIP / Sovereign Tier</p>
          <p className="text-2xl font-black text-[#D4AF37] mt-1">
            {activeMembers.filter(m => m.tierId === 'sovereign' || m.tierId === 'black_circle').length}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Gold & Black Circle Members</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Applications</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {applications.filter(a => a.status === 'pending').length}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Awaiting compliance review</p>
        </div>
      </div>

      {/* Main Section: Member Roster */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#18211F] flex items-center gap-2">
              <Crown className="w-5 h-5 text-emerald-800" />
              Kretz Club Active Member Roster
            </h3>
            <p className="text-xs text-slate-500">
              Audit memberships, modify assigned tiers, grant honorary access, and view digital card credentials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrantModal(true)}
              className="btn btn-primary py-2.5 px-4 text-xs font-bold bg-[#182D2A] text-white hover:bg-[#24423C] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>Grant Honorary Membership</span>
            </button>
            <button
              onClick={refreshData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Refresh roster"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or member number (#KRTZ)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#182D2A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="heritage">Resident Heritage</option>
              <option value="sovereign">Sovereign Privilège</option>
              <option value="black_circle">Black Circle</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3">Billing</th>
                <th className="py-3 px-3">Renewal</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No members found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-[#18211F]">{m.userName}</p>
                      <p className="text-[11px] text-slate-500">{m.userEmail}</p>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                      {m.memberNumber}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        m.tierId === 'black_circle'
                          ? 'bg-slate-900 text-white'
                          : m.tierId === 'sovereign'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.tierName}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 capitalize text-slate-600">
                      {m.billingCycle} ({formatCurrency(m.feePaid)})
                    </td>

                    <td className="py-3.5 px-3 text-slate-600">
                      {new Date(m.renewalDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleAutoRenew(m.id, m.autoRenew)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-white"
                          title="Toggle auto-renewal"
                        >
                          {m.autoRenew ? 'Pause Auto' : 'Resume Auto'}
                        </button>
                        {m.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(m.id)}
                            className="px-2 py-1 rounded-lg border border-rose-200 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier Pricing Configuration Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#18211F] flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-800" />
              Dynamic Membership Tier Pricing Configurator
            </h3>
            <p className="text-xs text-slate-500">
              Update live membership rates for the public landing page in real time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.id} className="p-5 rounded-2xl border border-slate-200 space-y-3 bg-[#FDFEFC]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t.name}</span>
                <button
                  onClick={() => {
                    setEditingTier(t);
                    setEditAnnualPrice(t.priceAnnual);
                    setEditMonthlyPrice(t.priceMonthly);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Edit pricing"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Dues:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(t.priceAnnual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Dues:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(t.priceMonthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Off-Market Quota:</span>
                  <span className="font-bold text-slate-900">{t.maxOffMarketDossiers} dossiers</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Honorary Membership Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-emerald-800" />
                Grant Honorary Membership Pass
              </h4>
              <button onClick={() => setShowGrantModal(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>

            <form onSubmit={handleGrantMembership} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={grantName}
                  onChange={(e) => setGrantName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="elena@familyoffice.es"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Membership Tier</label>
                <select
                  value={grantTier}
                  onChange={(e) => setGrantTier(e.target.value as MembershipTierId)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="heritage">Resident Heritage</option>
                  <option value="sovereign">Sovereign Privilège</option>
                  <option value="black_circle">Founder’s Black Circle</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#182D2A] text-white font-bold hover:bg-[#24423C]"
                >
                  Issue Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left border border-slate-200 shadow-2xl space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">
              Update Rates for {editingTier.name}
            </h4>

            <form onSubmit={handleUpdateTierConfig} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Annual Fee (€)</label>
                <input
                  type="number"
                  required
                  value={editAnnualPrice}
                  onChange={(e) => setEditAnnualPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monthly Fee (€)</label>
                <input
                  type="number"
                  required
                  value={editMonthlyPrice}
                  onChange={(e) => setEditMonthlyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#182D2A] text-white font-bold hover:bg-[#24423C]"
                >
                  Save Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
