import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../../lib/utils';

export interface AnimatedNumericValueProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  currency?: string;
  isCurrency?: boolean;
  formatAsCurrency?: boolean;
  variant?: 'primary' | 'positive' | 'pending' | 'muted';
}

/**
 * AnimatedNumericValue — Institutional Financial Typography
 * 
 * - Rendered in Inter / Geist with strict tabular-nums.
 * - Always formats 2 decimal places with thousands separators.
 * - Enforces zero spacing between currency symbol and amount.
 * - Prevents wrapping onto multiple lines (whitespace-nowrap).
 * - Smooth count-up on initial load only; subtle, swift transition on backend updates.
 * - Never fabricates fake financial figures.
 */
export const AnimatedNumericValue: React.FC<AnimatedNumericValueProps> = ({
  value,
  duration,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 2,
  currency = 'EUR',
  isCurrency,
  formatAsCurrency,
  variant,
}) => {
  const currencyMode = isCurrency ?? formatAsCurrency ?? true;

  const [displayValue, setDisplayValue] = useState<number>(() => {
    // If reduced motion is requested, render real backend value immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return value;
    }
    // Initial mount starts from 0 for the smooth initial reveal
    return 0;
  });

  const prevValueRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      isInitialMountRef.current = false;
      return;
    }

    const startValue = isInitialMountRef.current ? 0 : prevValueRef.current;
    const endValue = value;

    // Use smooth count-up on initial load (~850ms), and subtle swift transition on data updates (~380ms)
    const animDuration = duration ?? (isInitialMountRef.current ? 850 : 380);
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);

      // Smooth cubic ease-out: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        isInitialMountRef.current = false;
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  // Strict institutional formatting: always 2 decimal places, thousands commas, zero gap
  let formatted: string;
  if (currencyMode) {
    formatted = formatCurrency(displayValue, currency);
  } else {
    const numPart = displayValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatted = `${prefix}${numPart}${suffix}`;
  }

  // Variant color mappings
  let variantClass = '';
  if (variant === 'positive') {
    variantClass = 'financial-val-positive text-[#43C98B]';
  } else if (variant === 'pending') {
    variantClass = 'financial-val-pending text-[#E5A84B]';
  } else if (variant === 'muted') {
    variantClass = 'financial-label-secondary text-[#777979]';
  } else if (variant === 'primary') {
    variantClass = 'financial-val-primary text-[#F5F5F2]';
  }

  return (
    <span
      className={`financial-num font-[600] whitespace-nowrap tabular-nums tracking-tight ${variantClass} ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1, "cv05" 1',
      }}
    >
      {formatted}
    </span>
  );
};
