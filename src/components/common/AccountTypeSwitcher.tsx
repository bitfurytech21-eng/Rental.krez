import React, { useState } from 'react';
import { User, AccountType, ACCOUNT_TYPES, getAccountTypeLabel } from '../../types/user';
import { ledger } from '../../lib/ledger';
import { Users, Building2, ShieldCheck, Briefcase, UserCheck, CheckCircle2, ChevronRight, Sparkles, Building, Landmark } from 'lucide-react';

interface AccountTypeSwitcherProps {
  user: User;
  onRefresh: () => void;
  onMessage: (msg: string) => void;
}

export const AccountTypeSwitcher: React.FC<AccountTypeSwitcherProps> = ({ user, onRefresh, onMessage }) => {
  const [selectedType, setSelectedType] = useState<AccountType>(user.accountType || 'individual_investor');
  const [jointHolderName, setJointHolderName] = useState(user.jointHolderName || '');
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [institutionName, setInstitutionName] = useState(user.institutionName || '');
  const [taxId, setTaxId] = useState(user.taxId || '');
  const [registrationNumber, setRegistrationNumber] = useState(user.registrationNumber || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      ledger.updateUserAccountType(user.id, selectedType, {
        jointHolderName,
        companyName,
        institutionName,
        taxId,
        registrationNumber
      });
      onRefresh();
      setIsSaving(false);
      onMessage(`Investor profile successfully switched to ${getAccountTypeLabel(selectedType)}!`);
    }, 500);
  };

  const getAccountIcon = (id: AccountType) => {
    switch (id) {
      case 'joint_account':
        return <Users className="w-5 h-5 text-emerald-400" />;
      case 'corporate_entity':
        return <Building2 className="w-5 h-5 text-indigo-400" />;
      case 'family_office':
      case 'institutional_investor':
        return <Landmark className="w-5 h-5 text-amber-400" />;
      case 'property_owner':
        return <Building className="w-5 h-5 text-cyan-400" />;
      case 'accredited_investor':
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      default:
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="dash-card p-7 rounded-3xl border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-inherit/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold dash-text">Account Type & Investor Profile Switcher</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Data Model Configured
              </span>
            </div>
            <p className="text-xs dash-muted">
              Select your investor profile (Individual, Joint, Institutional, Corporate, or Property Owner) and configure relevant entity fields.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Grid of Account Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCOUNT_TYPES.filter(t => t.id !== 'admin').map((typeOpt) => {
            const isSelected = selectedType === typeOpt.id;
            return (
              <div
                key={typeOpt.id}
                onClick={() => setSelectedType(typeOpt.id)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md'
                    : 'dash-inner border-inherit/30 hover:border-inherit/60 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-inherit/20 border border-inherit/30 flex items-center justify-center">
                      {getAccountIcon(typeOpt.id)}
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                      isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-inherit/20 dash-muted'
                    }`}>
                      {typeOpt.badge}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold dash-text mb-1">{typeOpt.shortLabel}</h4>
                  <p className="text-[11px] dash-muted line-clamp-2">{typeOpt.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-inherit/25 flex items-center justify-between text-[11px]">
                  <span className="dash-muted">Min Allocation:</span>
                  <span className="font-bold dash-text">{typeOpt.minInvestment}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Relevant Fields based on Selected Account Type */}
        <div className="p-5 rounded-2xl dash-inner border border-inherit/30 space-y-4">
          <h4 className="text-xs font-bold dash-text uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Specific Details for {getAccountTypeLabel(selectedType)}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedType === 'joint_account' && (
              <div className="sm:col-span-2 form-field">
                <label className="dash-text text-xs font-bold">Secondary Joint Holder / Co-Investor Full Name</label>
                <input
                  type="text"
                  value={jointHolderName}
                  onChange={(e) => setJointHolderName(e.target.value)}
                  placeholder="e.g., Claire Kretz / Partner Name"
                  className="dash-inner border dash-text text-xs px-4 py-2.5 rounded-xl w-full"
                />
                <span className="text-[10px] dash-muted">Required for co-ownership on tokenized deeds and monthly rental distributions.</span>
              </div>
            )}

            {(selectedType === 'corporate_entity' || selectedType === 'family_office') && (
              <>
                <div className="form-field">
                  <label className="dash-text text-xs font-bold">Entity / Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Kretz Holding S.A. / Family Trust LLC"
                    className="dash-inner border dash-text text-xs px-4 py-2.5 rounded-xl w-full"
                  />
                </div>
                <div className="form-field">
                  <label className="dash-text text-xs font-bold">Company Registration / VAT Number</label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g., RCS Paris B 982 124 382"
                    className="dash-inner border dash-text text-xs px-4 py-2.5 rounded-xl w-full"
                  />
                </div>
              </>
            )}

            {selectedType === 'institutional_investor' && (
              <div className="sm:col-span-2 form-field">
                <label className="dash-text text-xs font-bold">Institution / Fund Name</label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g., Sovereign Wealth Partners Europe"
                  className="dash-inner border dash-text text-xs px-4 py-2.5 rounded-xl w-full"
                />
              </div>
            )}

            <div className="form-field">
              <label className="dash-text text-xs font-bold">Tax ID / National Identification Number</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g., FR-9831928310"
                className="dash-inner border dash-text text-xs px-4 py-2.5 rounded-xl w-full"
              />
            </div>

            <div className="form-field">
              <label className="dash-text text-xs font-bold">Primary Contact Email / Phone</label>
              <input
                type="text"
                value={user.phoneNumber || '+33 1 42 68 55 00'}
                disabled
                className="dash-inner border dash-text opacity-70 text-xs px-4 py-2.5 rounded-xl w-full bg-inherit/10 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary text-xs font-bold px-8 py-3 flex items-center gap-2"
          >
            {isSaving ? 'Updating Investor Profile & Ledger...' : 'Save & Apply Account Type'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
