import React, { useState, useEffect, useMemo } from 'react';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { ledger, P2PListingOrder } from '../../lib/ledger';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  Search,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Plus,
  X,
  AlertCircle,
  Lock,
  Trash2,
} from 'lucide-react';

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
  const { showToast } = useToast();

  const [listings, setListings] = useState<P2PListingOrder[]>(() => ledger.getP2PListings());
  const [ledgerTick, setLedgerTick] = useState(0);
  const [selectedListing, setSelectedListing] = useState<P2PListingOrder | null>(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<P2PListingOrder | null>(null);
  const [purchaseAmountTokens, setPurchaseAmountTokens] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [discountOnlyFilter, setDiscountOnlyFilter] = useState<boolean>(false);
  const [isCreatingSellOrder, setIsCreatingSellOrder] = useState<boolean>(false);
  const [selectedInvestmentForSell, setSelectedInvestmentForSell] = useState<Investment | null>(null);
  const [sellTokenCount, setSellTokenCount] = useState<number>(1);
  const [sellAskingPrice, setSellAskingPrice] = useState<number>(100);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setListings(ledger.getP2PListings());
    return ledger.subscribe(() => {
      setListings(ledger.getP2PListings());
      setLedgerTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processingOrder) {
        setSelectedListing(null);
        setIsCreatingSellOrder(false);
        setConfirmCancelOrder(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [processingOrder]);

  const userInvestments = useMemo(() => {
    void ledgerTick;
    return user ? ledger.getInvestments(user.id).filter((i) => i.tokensPurchased > 0) : [];
  }, [user, ledgerTick]);

  const filteredListings = useMemo(() => {
    return listings.filter((lst) => {
      if (lst.status !== 'open' || lst.tokensAvailable <= 0) return false;
      const variancePct =
        lst.parValuePerToken > 0
          ? ((lst.askingPricePerToken - lst.parValuePerToken) / lst.parValuePerToken) * 100
          : 0;
      if (discountOnlyFilter && variancePct >= 0) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        return (
          lst.propertyTitle.toLowerCase().includes(q) ||
          lst.tokenTicker.toLowerCase().includes(q) ||
          lst.sellerName.toLowerCase().includes(q) ||
          lst.propertyLocation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [listings, discountOnlyFilter, searchFilter]);

  const handleExecutePurchase = async () => {
    if (!selectedListing || processingOrder) return;
    if (!user) {
      setOrderError('Please sign in to acquire fractional units on the secondary desk.');
      return;
    }

    setProcessingOrder(true);
    setOrderError(null);

    try {
      const createdInvestment = ledger.executeP2PPurchase({
        buyerId: user.id,
        orderId: selectedListing.id,
        tokensToBuy: purchaseAmountTokens,
      });

      if (refreshUser) {
        await refreshUser();
      }

      const msg = `Acquired ${createdInvestment.tokensPurchased} ${selectedListing.tokenTicker} units (Cert: ${createdInvestment.certificateId}) on the secondary desk.`;
      setOrderSuccess(msg);
      showToast(msg, 'success');
      setSelectedListing(null);
      if (onSuccessTransaction) onSuccessTransaction();
    } catch (err: any) {
      setOrderError(err?.message || 'Transaction settlement error on secondary desk.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleCreateSellListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentForSell || !user || processingOrder) return;

    setProcessingOrder(true);
    setOrderError(null);

    try {
      const order = ledger.createP2PSellOrder({
        sellerId: user.id,
        propertyId: selectedInvestmentForSell.propertyId,
        tokensToSell: sellTokenCount,
        askingPricePerToken: sellAskingPrice,
      });
      if (refreshUser) await refreshUser();

      setIsCreatingSellOrder(false);
      setSelectedInvestmentForSell(null);
      const msg = `Escrowed ${order.tokensAvailable} ${order.tokenTicker} units at ${formatCurrency(order.askingPricePerToken)}/unit on the P2P order book.`;
      setOrderSuccess(msg);
      showToast(msg, 'success');
    } catch (err: any) {
      setOrderError(err?.message || 'Unable to publish secondary sell order.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleCancelOwnOrder = async () => {
    if (!confirmCancelOrder || !user || processingOrder) return;
    setProcessingOrder(true);
    try {
      ledger.cancelP2PSellOrder(confirmCancelOrder.id, user.id);
      if (refreshUser) await refreshUser();
      const msg = `Cancelled order and restored ${confirmCancelOrder.tokensAvailable} ${confirmCancelOrder.tokenTicker} units to your portfolio.`;
      setOrderSuccess(msg);
      showToast(msg, 'info');
      setConfirmCancelOrder(null);
    } catch (err: any) {
      showToast(err?.message || 'Could not cancel P2P listing.', 'error');
    } finally {
      setProcessingOrder(false);
    }
  };

  const subtotalPurchase = selectedListing
    ? Number((purchaseAmountTokens * selectedListing.askingPricePerToken).toFixed(2))
    : 0;
  const clearingFeePurchase = Number((subtotalPurchase * 0.005).toFixed(2));
  const totalPayablePurchase = Number((subtotalPurchase + clearingFeePurchase).toFixed(2));

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
            Peer-to-peer atomic escrow for buying and selling tokenized real estate units between whitelisted investors (0.50% clearing fee).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {userInvestments.length > 0 && (
            <button
              type="button"
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
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{orderSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setOrderSuccess(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8EA09B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Filter secondary market orders"
            placeholder="Filter by property title, ticker, or seller..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-[#18211F] placeholder-[#8EA09B] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            aria-pressed={discountOnlyFilter}
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
              <th className="py-3 px-4">Property &amp; Ticker</th>
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
                <td colSpan={7} className="py-10 text-center text-[#69736F]">
                  No active secondary listings match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredListings.map((lst) => {
                const variancePct =
                  lst.parValuePerToken > 0
                    ? Number(
                        (
                          ((lst.askingPricePerToken - lst.parValuePerToken) /
                            lst.parValuePerToken) *
                          100
                        ).toFixed(1)
                      )
                    : 0;
                const isOwnListing = Boolean(user && lst.sellerId === user.id);

                return (
                  <tr key={lst.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <button
                        type="button"
                        onClick={() => onSelectProperty && onSelectProperty(lst.propertyId)}
                        className="font-bold text-[#18211F] hover:text-[#27845D] block truncate text-left cursor-pointer"
                      >
                        {lst.propertyTitle}
                      </button>
                      <span className="font-mono text-[11px] text-[#27845D] font-semibold">
                        {lst.tokenTicker} · {lst.propertyLocation}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#18211F] block">
                        {lst.sellerName} {isOwnListing && '(You)'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#27845D] font-bold">
                        <ShieldCheck className="w-3 h-3 text-[#27845D]" /> Escrow Verified
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#18211F]">
                      {formatCurrency(lst.askingPricePerToken)}
                      <span className="text-[10px] font-normal text-[#69736F] block">
                        Par NAV: {formatCurrency(lst.parValuePerToken)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {variancePct < 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {variancePct}% Discount
                        </span>
                      ) : variancePct > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          +{variancePct}% Premium
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Par Value
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#18211F]">
                      {lst.tokensAvailable} Units
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                      {formatPercent(lst.estimatedAnnualYield)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isOwnListing ? (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelOrder(lst)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Cancel Order</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedListing(lst);
                            setPurchaseAmountTokens(Math.min(2, lst.tokensAvailable));
                            setOrderError(null);
                            setOrderSuccess(null);
                          }}
                          className="btn btn-primary btn-sm text-xs font-bold cursor-pointer"
                        >
                          Buy Units
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Buy Modal Dialog */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="p2p-buy-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#27845D] tracking-wider block">
                  P2P Secondary Atomic Order
                </span>
                <h3 id="p2p-buy-modal-title" className="text-base font-bold text-[#18211F]">
                  {selectedListing.propertyTitle}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close purchase modal"
                onClick={() => setSelectedListing(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
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
                  <span className="text-[#69736F]">Ask Price per Unit:</span>
                  <span className="font-mono font-bold text-[#27845D]">
                    {formatCurrency(selectedListing.askingPricePerToken)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#69736F]">Escrowed Units Available:</span>
                  <span className="font-mono font-bold text-[#18211F]">
                    {selectedListing.tokensAvailable} Units
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="p2p-buy-qty" className="block text-xs font-bold text-[#18211F] mb-1">
                  Quantity of Units to Acquire
                </label>
                <input
                  id="p2p-buy-qty"
                  type="number"
                  min={1}
                  max={selectedListing.tokensAvailable}
                  value={purchaseAmountTokens}
                  onChange={(e) => {
                    setOrderError(null);
                    setPurchaseAmountTokens(
                      Math.max(
                        1,
                        Math.min(selectedListing.tokensAvailable, parseInt(e.target.value, 10) || 1)
                      )
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] text-sm font-mono font-bold text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#142421] text-white space-y-1.5 font-mono">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Token Subtotal:</span>
                  <span>{formatCurrency(subtotalPurchase)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>P2P Clearing Fee (0.50%):</span>
                  <span>{formatCurrency(clearingFeePurchase)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-white/10">
                  <span className="text-slate-200 font-bold">Total Settlement Payable:</span>
                  <span className="text-sm font-bold text-[#B7E36A]">
                    {formatCurrency(totalPayablePurchase)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Your Available EUR Balance:</span>
                  <span>{formatCurrency(user?.walletBalance || 0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px] text-[#52605C] bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <Lock className="w-3.5 h-3.5 text-[#27845D] shrink-0" />
                <span>Escrowed units transfer atomically upon settlement verification.</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={processingOrder || !user || user.walletBalance < totalPayablePurchase}
                className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {processingOrder
                  ? 'Settling Order...'
                  : !user
                  ? 'Sign In Required'
                  : user.walletBalance < totalPayablePurchase
                  ? 'Insufficient Balance'
                  : 'Confirm Atomic Purchase'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                disabled={processingOrder}
                className="btn btn-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Own Listing Confirmation Dialog */}
      {confirmCancelOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="p2p-cancel-order-title"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
            <h3 id="p2p-cancel-order-title" className="text-base font-bold text-[#18211F]">
              Cancel Secondary Listing?
            </h3>
            <p className="text-xs text-[#52605C] leading-relaxed">
              Cancelling this order will withdraw{' '}
              <strong className="text-[#18211F] font-mono">
                {confirmCancelOrder.tokensAvailable} {confirmCancelOrder.tokenTicker}
              </strong>{' '}
              units from the order book and return them immediately to your active portfolio.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelOwnOrder}
                disabled={processingOrder}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {processingOrder ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancelOrder(null)}
                disabled={processingOrder}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E3E8E3] text-[#18211F] text-xs font-semibold cursor-pointer"
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sell Order Dialog */}
      {isCreatingSellOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="p2p-sell-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#27845D] tracking-wider block">
                  Escrow Assets for Sale
                </span>
                <h3 id="p2p-sell-modal-title" className="text-base font-bold text-[#18211F]">
                  Publish Secondary Sell Order
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close sell order modal"
                onClick={() => setIsCreatingSellOrder(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSellListingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="p2p-sell-holding" className="block font-bold text-[#18211F] mb-1">
                  Select Investment Holding to Escrow
                </label>
                <select
                  id="p2p-sell-holding"
                  value={selectedInvestmentForSell?.id || ''}
                  onChange={(e) => {
                    const found = userInvestments.find((inv) => inv.id === e.target.value);
                    setSelectedInvestmentForSell(found || null);
                    setOrderError(null);
                    if (found) {
                      setSellTokenCount(Math.min(1, found.tokensPurchased));
                      setSellAskingPrice(found.tokenPrice);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                  required
                >
                  <option value="">-- Choose from active portfolio --</option>
                  {userInvestments.map((inv) => {
                    const matchedProp = properties.find((p) => p.id === inv.propertyId);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.propertyTitle} ({inv.tokensPurchased}{' '}
                        {matchedProp?.tokenTicker || 'Units'} owned)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedInvestmentForSell && (
                <>
                  <div>
                    <label htmlFor="p2p-sell-qty" className="block font-bold text-[#18211F] mb-1">
                      Number of Units to List (Max: {selectedInvestmentForSell.tokensPurchased})
                    </label>
                    <input
                      id="p2p-sell-qty"
                      type="number"
                      min={1}
                      max={selectedInvestmentForSell.tokensPurchased}
                      value={sellTokenCount}
                      onChange={(e) =>
                        setSellTokenCount(
                          Math.max(
                            1,
                            Math.min(
                              selectedInvestmentForSell.tokensPurchased,
                              parseInt(e.target.value, 10) || 1
                            )
                          )
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] font-mono text-xs text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                    />
                  </div>

                  <div>
                    <label htmlFor="p2p-sell-price" className="block font-bold text-[#18211F] mb-1">
                      Asking Price per Unit (€)
                    </label>
                    <input
                      id="p2p-sell-price"
                      type="number"
                      step={0.5}
                      min={1}
                      value={sellAskingPrice}
                      onChange={(e) => setSellAskingPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E3E8E3] font-mono text-xs text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                    />
                    <span className="text-[10.5px] text-[#69736F] block mt-1">
                      Original NAV Price: {formatCurrency(selectedInvestmentForSell.tokenPrice)} / unit
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#69736F]">Gross Proceeds Upon Fill:</span>
                      <span className="font-bold text-[#27845D]">
                        {formatCurrency(sellTokenCount * sellAskingPrice)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!selectedInvestmentForSell || processingOrder}
                  className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {processingOrder ? 'Publishing...' : 'Escrow & Publish Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingSellOrder(false)}
                  disabled={processingOrder}
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
