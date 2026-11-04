/**
 * Rainbow Chart Styling & Theme Configuration
 * Strict adherence to the institutional Black & White Dashboard with Rainbow Visualisations
 */

export const RAINBOW_COLORS = [
  '#00D2FF', // Cyan
  '#2ECC71', // Green
  '#FFD93D', // Yellow
  '#FF9F43', // Orange
  '#FF4D4D', // Red
  '#FF65B3', // Pink
  '#A66CFF', // Purple
  '#4287FF', // Blue
] as const;

export const RAINBOW_NAMED = {
  red: '#FF4D4D',
  orange: '#FF9F43',
  yellow: '#FFD93D',
  green: '#2ECC71',
  cyan: '#00D2FF',
  blue: '#4287FF',
  purple: '#A66CFF',
  pink: '#FF65B3',
} as const;

export const CHART_THEME = {
  background: '#151515',
  cardBackground: '#151515',
  cardBorder: '#303030',
  secondarySurface: '#1D1D1D',
  gridStroke: '#262626',
  axisStroke: '#303030',
  axisTick: '#D0D0D0',
  axisMuted: '#999999',
  tooltipStyle: {
    backgroundColor: '#151515',
    borderColor: '#303030',
    borderRadius: '12px',
    color: '#FFFFFF',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85)',
    padding: '10px 14px',
    fontSize: '12px',
  },
  cursor: {
    stroke: '#00D2FF',
    strokeWidth: 1.5,
    strokeDasharray: '3 3',
  },
} as const;

export function getRainbowColor(index: number): string {
  return RAINBOW_COLORS[index % RAINBOW_COLORS.length];
}
