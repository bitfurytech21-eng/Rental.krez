import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Shield, Lock, ArrowRight, Building2 } from 'lucide-react';

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
  const { quickDemoSession } = useAuth();
  const [email, setEmail] = useState('admin@lagence.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await quickDemoSession('admin');
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate admin session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#18211F] text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#222E2B] rounded-2xl border border-[#32423E] p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#27845D]/20 border border-[#27845D] flex items-center justify-center mx-auto mb-4 text-[#27845D]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">L'Agence Admin Portal</h1>
          <p className="text-xs text-[#A1ACA7] mt-1">Authorized Executive & Management Access</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A1ACA7] mb-1.5">Executive Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#18211F] border border-[#32423E] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#27845D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1ACA7] mb-1.5">Security Credentials</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#18211F] border border-[#32423E] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#27845D]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-[#27845D] hover:bg-[#1f6b4b] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#32423E] flex items-center justify-between text-xs text-[#A1ACA7]">
          <button
            onClick={onNavigateCustomerLogin}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Investor Portal
          </button>
          <button
            onClick={onNavigateHome}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
        </div>
      </div>
    </div>
  );
};
