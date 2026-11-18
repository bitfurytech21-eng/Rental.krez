/**
 * EUR-decimal <-> integer-cent boundary helpers.
 *
 * Database financial columns remain EUR decimals. Convert only at read/API
 * boundaries; never write these derived cent values back to legacy columns.
 */
export function eurToCents(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const raw = String(value).trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new TypeError(`Invalid EUR decimal amount: ${raw}`);
  }

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  const signed = negative ? -cents : cents;
  const result = Number(signed);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('EUR amount exceeds the safe integer-cent range.');
  }
  return result;
}

export function centsToEur(cents: number): number {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError('Amount in cents must be a safe integer.');
  }
  return cents / 100;
}

export function formatEurCents(cents: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToEur(cents));
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError('Every amount must be a safe integer number of cents.');
    }
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError('Total exceeds the safe integer-cent range.');
    }
    return next;
  }, 0);
}
