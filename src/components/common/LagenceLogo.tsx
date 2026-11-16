import React, { useId } from 'react';

interface LagenceLogoProps {
  className?: string;
  variant?: 'gold' | 'green';
}

export const LagenceLogo: React.FC<LagenceLogoProps> = ({
  className = 'w-7 h-7',
  variant = 'gold',
}) => {
  const uid = useId().replace(/:/g, '');
  const outerGradId = `lagenceOuter_${uid}`;
  const innerGradId = `lagenceInner_${uid}`;

  const outerStops =
    variant === 'green'
      ? ['#9AE7CA', '#6FD8B0', '#3BA984']
      : ['#E2B76E', '#C59B4C', '#8A6729'];

  const innerStops =
    variant === 'green'
      ? ['#C4F3E1', '#6FD8B0']
      : ['#F5D8A8', '#B88746'];

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={outerGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={outerStops[0]} />
          <stop offset="50%" stopColor={outerStops[1]} />
          <stop offset="100%" stopColor={outerStops[2]} />
        </linearGradient>
        <linearGradient id={innerGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={innerStops[0]} />
          <stop offset="100%" stopColor={innerStops[1]} />
        </linearGradient>
      </defs>
      {/* Outer rounded architectural portal */}
      <path
        d="M6 30V14.5C6 8.701 10.701 4 16.5 4H17.5C23.299 4 28 8.701 28 14.5V30"
        stroke={`url(#${outerGradId})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner nested arch portal */}
      <path
        d="M13 30V16C13 13.7909 14.7909 12 17 12C19.2091 12 21 13.7909 21 16V30"
        stroke={`url(#${innerGradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Intertwining architectural column */}
      <line
        x1="28"
        y1="16"
        x2="28"
        y2="30"
        stroke={`url(#${outerGradId})`}
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
};
