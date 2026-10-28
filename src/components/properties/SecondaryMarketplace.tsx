import React, { useState } from 'react';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { getSolanaExplorerUrl } from '../../lib/solanaService';
import { 
  ArrowUpDown, 
  Search, 
  Filter, 
  Coins, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Tag, 
  Plus, 
  X, 
  ExternalLink, 
  Check, 
  AlertCircle,
  Clock,
  ArrowRight,
  Building2,
  Lock
} from 'lucide-react';

export interface P2PListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerKyCVerified: boolean;
  propertyId: string;
  propertyTitle: string;
  tokenTicker: string;
  solanaMintAddress: string;
  originalTokenPrice: number;
  askingPricePerToken: number;
  tokenCount: number;
  availableTokens: number;
  estimatedAnnualYield: number;
  listedAt: string;
  status: 'active' | 'filled' | 'cancelled';
  discountVsNavPercent: number;
}

const INITIAL_P2P_LISTINGS: P2PListing[] = [
  {
    id: 'p2p-lst-001',
    sellerId: 'usr-vance-ch',
    sellerName: 'Vance Family Office S.A.',
    sellerKyCVerified: true,
    propertyId: 'prop-kretz-kp1-102',
    propertyTitle: 'ROQUEBRUNE-CAP-MARTIN - Ramingao - Golf Bleu',
    tokenTicker: 'KTZ-KP1102',
    solanaMintAddress: '7xKXtg2CW87d9C7M2f4yM3q5eK9bXzP1L0v8R6sQ4W2N',
    originalTokenPrice: 100,
    askingPricePerToken: 96.50,
    tokenCount: 150,
    availableTokens: 150,
    estimatedAnnualYield: 7.8,
    listedAt: '2026-02-12',
    status: 'active',
    discountVsNavPercent: -3.5,
  },
  {
    id: 'p2p-lst-002',
    sellerId: 'usr-delacroix-fr',
    sellerName: 'Delacroix Patrimoine SCI',
    sellerKyCVerified: true,
    propertyId: 'prop-kretz-kp1-104',
    propertyTitle: 'PARIS XVI - Avenue Foch Penthouse',
    tokenTicker: 'KTZ-PAR16',
    solanaMintAddress: '8yLYuh3DX98e0D8N3g5zL0r6fL0cYyQ2M1w9S7tR5X3P',
    originalTokenPrice: 250,
    askingPricePerToken: 242.00,
    tokenCount: 80,
    availableTokens: 80,
    estimatedAnnualYield: 8.2,
    listedAt: '2026-02-18',
    status: 'active',
    discountVsNavPercent: -3.2,
  },
  {
    id: 'p2p-lst-003',
    sellerId: 'usr-trust-01',
    sellerName: 'Monaco Private Wealth Trust',
    sellerKyCVerified: true,
    propertyId: 'prop-kretz-kp1-108',
    propertyTitle: 'CANNES - La Croisette Waterfront Residence',
    tokenTicker: 'KTZ-CAN01',
    solanaMintAddress: '9zMZvi4EY09f1E9O4h6aM1s7gM1dZzR3N2x0T8uS6Y4Q',
    originalTokenPrice: 150,
    askingPricePerToken: 154.50,
    tokenCount: 200,
    availableTokens: 200,
    estimatedAnnualYield: 9.1,
    listedAt: '2026-02-22',
    status: 'active',
    discountVsNavPercent: +3.0,
  },
];

interface SecondaryMarketplaceProps {
  properties: Property[];
  onSelectProperty?: (propertyId: string) => void;
  onSuccessTransaction?: () => void;
}

export const SecondaryMarketplace: React.FC<SecondaryMarketplaceProps> = ({
  properties,
  onSelectProperty,
  onSuccessTransaction,
}) => {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState<P2PListing[]>(INITIAL_P2P_LISTINGS);
  const [selectedListing, setSelectedListing] = useState<P2PListing | null>(null);
  const [purchaseAmountTokens, setPurchaseAmountTokens] = useState<number>(10);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [discountOnlyFilter, setDiscountOnlyFilter] = useState<boolean>(false);
  const [isCreatingSellOrder, setIsCreatingSellOrder] = useState<boolean>(false);
  const [selectedInvestmentForSell, setSelectedInvestmentForSell] = useState<Investment | null>(null);
  const [sellTokenCount, setSellTokenCount] = useState<number>(10);
  const [sellAskingPrice, setSellAskingPrice] = useState<number>(100);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const userInvestments = user ? ledger.getInvestments(user.id) : [];

  const filteredListings = listings.filter((lst) => {
    if (lst.status !== 'active') return false;
    if (discountOnlyFilter && lst.discountVsNavPercent >= 0) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        lst.propertyTitle.toLowerCase().includes(q) ||
        lst.tokenTicker.toLowerCase().includes(q) ||
        lst.sellerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExecutePurchase = async () => {
    if (!selectedListing || !user) return;
    setProcessingOrder(true);
    setOrderError(null);

    const cost = purchaseAmountTokens * selectedListing.askingPricePerToken;
    if (user.walletBalance < cost) {
      setOrderError(`Insufficient wallet balance. Needed ${formatCurrency(cost)}, available ${formatCurrency(user.walletBalance)}.`);
      setProcessingOrder(false);
      return;
    }

    try {
      // Execute transaction via ledger
      await ledger.executeInvestment(
        user.id,
        selectedListing.propertyId,
        purchaseAmountTokens
      );

      if (refreshUser) {
        await refreshUser();
      }

      // Update available tokens on listing
      setListings((prev) =>
        prev.map((item) => {
          if (item.id === selectedListing.id) {
            const remain = item.availableTokens - purchaseAmountTokens;
            return {
              ...item,
              availableTokens: remain,
              status: remain <= 0 ? 'filled' : 'active',
            };
          }
          return item;
        })
      );

      setOrderSuccess(`Successfully acquired ${purchaseAmountTokens} ${selectedListing.tokenTicker} units on the Solana secondary desk!`);
      if (onSuccessTransaction) onSuccessTransaction();
    } catch (err: any) {
      setOrderError(err?.message || 'Transaction settlement error on secondary desk.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleCreateSellListingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentForSell || !user) return;

    if (sellTokenCount > selectedInvestmentForSell.tokensPurchased) {
      setOrderError('Cannot sell more units than currently owned in this allocation.');
      return;
    }

    const matchedProp = properties.find((p) => p.id === selectedInvestmentForSell.propertyId);
    const origPrice = selectedInvestmentForSell.tokenPrice || 100;
    const discount = Number((((sellAskingPrice - origPrice) / origPrice) * 100).toFixed(1));

    const newListing: P2PListing = {
      id: `p2p-lst-${Date.now()}`,
      sellerId: user.id,
      sellerName: user.fullName || 'Verified Client',
      sellerKyCVerified: user.kycStatus === 'verified',
      propertyId: selectedInvestmentForSell.propertyId,
      propertyTitle: selectedInvestmentForSell.propertyTitle,
      tokenTicker: matchedProp?.tokenTicker || 'KTZ-PROP',
      solanaMintAddress: matchedProp?.solanaMintAddress || 'SoL1MintAddress7777777777777777777777',
      originalTokenPrice: origPrice,
      askingPricePerToken: sellAskingPrice,
      tokenCount: sellTokenCount,
      availableTokens: sellTokenCount,
      estimatedAnnualYield: selectedInvestmentForSell.estimatedAnnualYield,
      listedAt: new Date().toISOString().split('T')[0],
      status: 'active',
      discountVsNavPercent: discount,
    };

    setListings([newListing, ...listings]);
    setIsCreatingSellOrder(false);
    setSelectedInvestmentForSell(null);
    setOrderSuccess(`Your order to sell ${sellTokenCount} units at ${formatCurrency(sellAskingPrice)}/unit is now active on the secondary desk.`);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E3E8E3] p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E3]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#27845D] text-xs font-bold mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Solana P2P Secondary Liquidity Desk</span>
          </div>
          <h2 className="text-2xl font-black text-[#18211F]">Secondary Market Order Book</h2>
          <p className="text-xs text-[#69736F]">
            Peer-to-peer liquidity protocol for buying and selling tokenized European luxury real estate shares between whitelisted investors.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {userInvestments.length > 0 && (
            <button
              onClick={() => {
                setIsCreatingSellOrder(true);
                setOrderError(null);
                setOrderSuccess(null);
              }}
              className="btn btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>List Tokens for Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {orderSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{orderSuccess}</span>
          </div>
          <button onClick={() => setOrderSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8EA09B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by property title, ticker, or seller..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-[#18211F] placeholder-[#8EA09B] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setDiscountOnlyFilter(!discountOnlyFilter)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              discountOnlyFilter
                ? 'bg-[#142421] text-white border-[#142421]'
                : 'bg-[#F6F7F4] text-[#18211F] border-[#E3E8E3] hover:bg-[#EEF2EC]'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#B7E36A]" />
            <span>Discounted below NAV</span>
          </button>
        </div>
      </div>

      {/* Active Listings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E3E8E3] text-[#69736F] font-semibold bg-[#F8FAFC]">
              <th className="py-3 px-4">Property & Ticker</th>
              <th className="py-3 px-4">Seller Status</th>
              <th className="py-3 px-4">Ask Price / Unit</th>
              <th className="py-3 px-4">NAV Variance</th>
              <th className="py-3 px-4">Available Units</th>
              <th className="py-3 px-4">Underwritten APY</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F2EE]">
            {filteredListings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#69736F]">
                  No active secondary listings match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredListings.map((lst) => (
                <tr key={lst.id} className="hover:bg-[#F9FAF8] transition-colors">
                  <td className="py-3.5 px-4 max-w-[220px]">
                    <span className="font-bold text-[#18211F] block truncate">{lst.propertyTitle}</span>
                    <span className="font-mono text-[11px] text-[#27845D] font-semibold">{lst.tokenTicker}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-[#18211F] block">{lst.sellerName}</span>
                    {lst.sellerKyCVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#27845D] font-bold">
                        <ShieldCheck className="w-3 h-3 text-[#27845D]" /> KYC Whitelisted
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#18211F]">
                    {formatCurrency(lst.askingPricePerToken)}
                    <span className="text-[10px] font-normal text-[#69736F] block">Orig: {formatCurrency(lst.originalTokenPrice)}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold">
                    {lst.discountVsNavPercent < 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {lst.discountVsNavPercent}% Discount
                      </span>
                    ) : lst.discountVsNavPercent > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        +{lst.discountVsNavPercent}% Premium
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Par Value</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-[#18211F]">
                    {lst.availableTokens} Units
                  </td>

                  <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                    {formatPercent(lst.estimatedAnnualYield)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedListing(lst);
                        setPurchaseAmountTokens(Math.min(10, lst.availableTokens));
                        setOrderError(null);
                        setOrderSuccess(null);
                      }}
                      className="btn btn-primary btn-sm text-xs font-bold cursor-pointer"
                    >
                      Buy Units
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Buy Modal Dialog */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#27845D] tracking-wider block">P2P Secondary Order</span>
                <h3 className="text-base font-bold text-[#18211F]">{selectedListing.propertyTitle}</h3>
              </div>
              <button onClick={() => setSelectedListing(null)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#69736F]">Seller:</span>
                  <span className="font-bold text-[#18211F]">{selectedListing.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#69736F]">Price per Unit:</span>
                  <span className="font-mono font-bold text-[#27845D]">{formatCurrency(selectedListing.askingPricePerToken)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#69736F]">Available Limit:</span>
                  <span className="font-mono font-bold text-[#18211F]">{selectedListing.availableTokens} Units</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">Quantity of Units to Acquire</label>
                <input
                  type="number"
                  min={1}
                  max={selectedListing.availableTokens}
                  value={purchaseAmountTokens}
                  onChange={(e) => setPurchaseAmountTokens(Math.max(1, Math.min(selectedListing.availableTokens, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] text-sm font-mono font-bold text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#142421] text-white space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Settlement Cost:</span>
                  <span className="text-sm font-bold text-[#B7E36A]">{formatCurrency(purchaseAmountTokens * selectedListing.askingPricePerToken)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Your Wallet Balance:</span>
                  <span>{formatCurrency(user?.walletBalance || 0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px] text-[#52605C] bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <Lock className="w-3.5 h-3.5 text-[#27845D] shrink-0" />
                <span>Programmatic Token-2022 Whitelist Hook validates settlement.</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleExecutePurchase}
                disabled={processingOrder}
                className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {processingOrder ? 'Settling Order...' : 'Confirm Atomic Purchase'}
              </button>
              <button
                onClick={() => setSelectedListing(null)}
                className="btn btn-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sell Order Dialog */}
      {isCreatingSellOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#27845D] tracking-wider block">List Assets for Sale</span>
                <h3 className="text-base font-bold text-[#18211F]">Secondary Market Listing</h3>
              </div>
              <button onClick={() => setIsCreatingSellOrder(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSellListingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#18211F] mb-1">Select Investment Holding to Sell</label>
                <select
                  value={selectedInvestmentForSell?.id || ''}
                  onChange={(e) => {
                    const found = userInvestments.find((inv) => inv.id === e.target.value);
                    setSelectedInvestmentForSell(found || null);
                    if (found) {
                      setSellTokenCount(found.tokensPurchased);
                      setSellAskingPrice(found.tokenPrice);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                  required
                >
                  <option value="">-- Choose from portfolio --</option>
                  {userInvestments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.propertyTitle} ({inv.tokensPurchased} Units)
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvestmentForSell && (
                <>
                  <div>
                    <label className="block font-bold text-[#18211F] mb-1">Number of Units to List</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedInvestmentForSell.tokensPurchased}
                      value={sellTokenCount}
                      onChange={(e) => setSellTokenCount(Math.max(1, Math.min(selectedInvestmentForSell.tokensPurchased, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] font-mono text-xs text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#18211F] mb-1">Asking Price per Unit (€)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={10}
                      value={sellAskingPrice}
                      onChange={(e) => setSellAskingPrice(parseFloat(e.target.value) || 10)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] font-mono text-xs text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                    />
                    <span className="text-[10.5px] text-[#69736F] block mt-1">
                      Original NAV Price: {formatCurrency(selectedInvestmentForSell.tokenPrice)} / unit
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#69736F]">Total Order Value:</span>
                      <span className="font-bold text-[#27845D]">{formatCurrency(sellTokenCount * sellAskingPrice)}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!selectedInvestmentForSell}
                  className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Publish P2P Order
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingSellOrder(false)}
                  className="btn btn-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
