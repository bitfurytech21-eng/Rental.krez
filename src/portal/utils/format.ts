export function formatCurrency(amount: number, currency = 'EUR', showSign = false): string {
  const num = Number.isFinite(amount) ? amount : 0;
  const code = String(currency || 'EUR').toUpperCase();
  const isIsoCurrency = /^[A-Z]{3}$/.test(code) && !['USDC', 'USDT', 'SOL'].includes(code);
  const formatted = isIsoCurrency
    ? new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(num))
    : `${new Intl.NumberFormat('en-IE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(num))} ${code}`;
  if (showSign && num > 0) return `+${formatted}`;
  if (num < 0) return `-${formatted}`;
  return formatted;
}

export function formatEuro(amount: number, showSign = false): string {
  return formatCurrency(amount, 'EUR', showSign);
}

export function formatNumber(value: number, decimals = 0): string {
  const num = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function maskIban(iban?: string | null): string {
  if (!iban) return 'Not configured';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export function maskWalletAddress(addr?: string | null): string {
  if (!addr) return 'Not configured';
  const clean = addr.trim();
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(input?: Date | string | null): string {
  if (!input) return 'Just now';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return 'Just now';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(nameOrEmail?: string | null): string {
  const clean = String(nameOrEmail || 'L').trim();
  if (!clean) return 'L';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 1).toUpperCase();
}
