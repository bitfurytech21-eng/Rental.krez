import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Shield, Lock, ArrowRight, Building2, AlertCircle } from 'lucide-react';

interface AdminLoginPortalProps {
  onLoginSuccess: () => void;
  onNavigateCustomerLogin: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPortal: React.FC<AdminLoginPortalProps> = ({
  onLoginSuccess,
  onNavigateCustomerLogin,
  onNavigateHome,
}) => {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide administrator email address and security password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminLogin(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed: Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1513] text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#131E1B] rounded-2xl border border-[#233530] p-8 sm:p-9 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#087F5B]/15 border border-[#087F5B]/40 flex items-center justify-center mx-auto mb-4 text-[#087F5B]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-xs text-[#8A9C96] mt-1.5 leading-relaxed">
            Secure server-verified access for authorized executive and compliance personnel.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs text-left font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-[#8A9C96] mb-1.5 uppercase tracking-wider">
              Administrator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kretz.com"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[#0B1513] border border-[#233530] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A9C96] mb-1.5 uppercase tracking-wider">
              Security Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-[#0B1513] border border-[#233530] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-[#087F5B] hover:bg-[#066548] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Admin Console</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#233530] flex items-center justify-between text-xs text-[#8A9C96]">
          <button
            onClick={onNavigateCustomerLogin}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Investor Portal
          </button>
          <button
            onClick={onNavigateHome}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
        </div>
      </div>
    </div>
  );
};
