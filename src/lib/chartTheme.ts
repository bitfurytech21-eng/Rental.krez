/**
 * Premium Graphite & Platinum Chart Styling & Theme Configuration
 * Multi-colour data visualization palette for institutional wealth management
 */

export const GRAPHITE_PALETTE = [
  '#43C98B', // Emerald green (Positive returns / Yield)
  '#55BDE8', // Ice blue (Capital / NAV / Info)
  '#B69AE8', // Soft violet (Secondary chart metric)
  '#E7B96D', // Warm gold (Highlights / Yield APY)
  '#E47E80', // Coral red (Negative indicators / Fees)
  '#F5F5F2', // Platinum white (Total valuation)
] as const;

export const RAINBOW_COLORS = GRAPHITE_PALETTE;

export const RAINBOW_NAMED = {
  emerald: '#43C98B',
  green: '#43C98B',
  iceBlue: '#55BDE8',
  cyan: '#55BDE8',
  blue: '#55BDE8',
  violet: '#B69AE8',
  purple: '#B69AE8',
  pink: '#B69AE8',
  gold: '#E7B96D',
  yellow: '#E7B96D',
  coral: '#E47E80',
  red: '#E47E80',
  orange: '#E7B96D',
  platinum: '#F5F5F2',
  white: '#F5F5F2',
} as const;

export const CHART_THEME = {
  background: '#141515',
  cardBackground: '#141515',
  cardBorder: '#292B2B',
  secondarySurface: '#1D1E1E',
  elevatedSurface: '#232424',
  gridStroke: '#292B2B',
  axisStroke: '#292B2B',
  axisTick: '#A5A6A5',
  axisMuted: '#777979',
  tooltipStyle: {
    backgroundColor: '#1D1E1E',
    borderColor: '#292B2B',
    borderRadius: '10px',
    color: '#F5F5F2',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
    padding: '8px 12px',
    fontSize: '12px',
  },
  cursor: {
    stroke: '#55BDE8',
    strokeWidth: 1.5,
    strokeDasharray: '3 3',
  },
} as const;

export function getRainbowColor(index: number): string {
  return GRAPHITE_PALETTE[index % GRAPHITE_PALETTE.length];
}
