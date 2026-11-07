import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Building2, Globe, Layers } from 'lucide-react';
import { RAINBOW_COLORS } from '../../lib/chartTheme';

interface PropertyLedgerAnalyticsProps {
  properties: Property[];
  investments: Investment[];
  onSelectProperty?: (propertyId: string) => void;
}

export const PropertyLedgerAnalytics: React.FC<PropertyLedgerAnalyticsProps> = ({
  properties,
  investments,
  onSelectProperty,
}) => {
  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) {
      map.set(p.id, p);
    }
    return map;
  }, [properties]);

  const allocationByProperty = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.totalAmountInvested || 0), 0);
    return investments.map((inv, i) => {
      const prop = propertyMap.get(inv.propertyId);
      const valuation = inv.currentValuation ?? inv.totalAmountInvested ?? 0;
      const invested = inv.totalAmountInvested || 0;
      const dividends = inv.totalDividendsReceived || 0;
      const weightPercent = totalInvested > 0 ? Math.round((invested / totalInvested) * 100) : 0;
      return {
        propertyId: inv.propertyId,
        title: inv.propertyTitle || prop?.title || 'Tokenized Property',
        shortTitle: (inv.propertyTitle || prop?.title || 'Prop').slice(0, 14),
        valuation,
        invested,
        dividends,
        weightPercent,
        apy: inv.estimatedAnnualYield || prop?.estimatedAnnualYield || 8.0,
        color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
        tokens: inv.tokensPurchased || 0,
      };
    });
  }, [investments, propertyMap]);

  const diversification = useMemo(() => {
    const regionMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    let totalVal = 0;

    for (const inv of investments) {
      const prop = propertyMap.get(inv.propertyId);
      const val = inv.currentValuation ?? inv.totalAmountInvested ?? 0;
      totalVal += val;

      const loc = inv.propertyLocation || prop?.location || 'Europe';
      const regName = loc.includes(',') ? loc.split(',').pop()!.trim() : loc;
      regionMap.set(regName, (regionMap.get(regName) || 0) + val);

      const pType = prop?.type || 'Residential SPV';
      typeMap.set(pType, (typeMap.get(pType) || 0) + val);
    }

    const byRegion = Array.from(regionMap.entries()).map(([name, value]) => ({
      name,
      value,
      percent: totalVal > 0 ? Math.round((value / totalVal) * 100) : 0,
    }));

    const byType = Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
      percent: totalVal > 0 ? Math.round((value / totalVal) * 100) : 0,
    }));

    const topRegionPercent = byRegion.reduce((max, r) => Math.max(max, r.percent), 0);
    let concentrationLabel = 'Balanced SPV Portfolio';
    if (investments.length === 0) concentrationLabel = 'No Active Holdings';
    else if (topRegionPercent > 70) concentrationLabel = 'Geographically Concentrated';

    return { byRegion, byType, concentrationLabel };
  }, [investments, propertyMap]);

  return (
    <div className="space-y-4">
      {/* 1. Property Performance Breakdown Card */}
      <div className="bg-[#151515] border border-[#303030] rounded-xl p-4 sm:p-5 shadow-lg space-y-3 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-[#303030]">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#4287FF]" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Property Performance Breakdown
              </h3>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Subscribed cost basis vs. current valuation and realized dividends
            </p>
          </div>
        </div>

        {allocationByProperty.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#A0A0A0] bg-[#202020] rounded-lg border border-[#303030] p-4 space-y-2">
            <p className="font-semibold text-white">No property performance records yet</p>
            <p className="text-[11px] text-[#A0A0A0]">
              Asset-level cost basis, valuation, and dividend yield attribution are calculated from your active holdings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allocationByProperty}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.8} />
                  <XAxis dataKey="shortTitle" tick={{ fontSize: 10, fill: '#A0A0A0' }} stroke="#303030" />
                  <YAxis tick={{ fontSize: 10, fill: '#A0A0A0' }} stroke="#303030" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151515',
                      borderColor: '#303030',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, key: any) => [
                      formatCurrency(Number(val || 0)),
                      key === 'invested'
                        ? 'Cost Basis'
                        : key === 'valuation'
                        ? 'Current Valuation'
                        : 'Realized Dividends',
                    ]}
                  />
                  <Bar dataKey="invested" fill="#4287FF" radius={[3, 3, 0, 0]} name="Cost Basis" />
                  <Bar dataKey="valuation" fill="#38C982" radius={[3, 3, 0, 0]} name="Current Valuation" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#303030] text-[10px] uppercase tracking-wider text-[#A0A0A0] bg-[#101010]">
                    <th className="py-2 px-2.5">Asset</th>
                    <th className="py-2 px-2 text-right">Cost Basis</th>
                    <th className="py-2 px-2 text-right">Dividends</th>
                    <th className="py-2 pl-2 text-right">Target APY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] font-mono tabular-nums bg-[#151515]">
                  {allocationByProperty.map((item) => (
                    <tr
                      key={item.propertyId}
                      className="hover:bg-[#202020] transition-colors cursor-pointer"
                      onClick={() => onSelectProperty && onSelectProperty(item.propertyId)}
                    >
                      <td className="py-2 px-2.5 font-sans font-semibold text-white truncate max-w-[160px]">
                        {item.title}
                      </td>
                      <td className="py-2 px-2 text-right text-[#A0A0A0]">
                        {formatCurrency(item.invested)}
                      </td>
                      <td className="py-2 px-2 text-right text-[#38C982] font-semibold">
                        +{formatCurrency(item.dividends)}
                      </td>
                      <td className="py-2 pl-2 text-right font-bold text-white">
                        {formatPercent(item.apy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. Investment Diversification Matrix Card */}
      <div className="bg-[#151515] border border-[#303030] rounded-xl p-4 sm:p-5 shadow-lg space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#303030]">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#35C9F5]" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Investment Diversification Matrix
              </h3>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Jurisdictional exposure and property typology across your active SPV holdings
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#202020] border border-[#303030] text-white self-start sm:self-auto">
            Profile: {diversification.concentrationLabel}
          </span>
        </div>

        {investments.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#A0A0A0] bg-[#202020] rounded-lg border border-[#303030] p-4">
            Diversification exposure across European markets and asset classes will populate automatically after your first SPV subscription.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Geographic Exposure */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#35C9F5]" /> Geographic Exposure
              </h4>
              {diversification.byRegion.map((reg, idx) => (
                <div key={reg.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{reg.name}</span>
                    <span className="font-mono tabular-nums text-[#A0A0A0]">
                      {formatCurrency(reg.value)} ({reg.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#202020] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-transform duration-500 origin-left"
                      style={{
                        backgroundColor: RAINBOW_COLORS[idx % RAINBOW_COLORS.length],
                        width: `${Math.min(100, reg.percent)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Asset Class Exposure */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#A66CFF]" /> Asset Typology Exposure
              </h4>
              {diversification.byType.map((typ, idx) => (
                <div key={typ.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{typ.name}</span>
                    <span className="font-mono tabular-nums text-[#A0A0A0]">
                      {formatCurrency(typ.value)} ({typ.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#202020] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-transform duration-500 origin-left"
                      style={{
                        backgroundColor: RAINBOW_COLORS[(idx + 4) % RAINBOW_COLORS.length],
                        width: `${Math.min(100, typ.percent)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
