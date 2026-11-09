import React from 'react';

interface LagenceLogoProps {
  className?: string;
}

export const LagenceLogo: React.FC<LagenceLogoProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lagenceGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2B76E" />
          <stop offset="50%" stopColor="#C59B4C" />
          <stop offset="100%" stopColor="#8A6729" />
        </linearGradient>
        <linearGradient id="lagenceGoldGradInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D8A8" />
          <stop offset="100%" stopColor="#B88746" />
        </linearGradient>
      </defs>
      {/* Outer rounded architectural portal */}
      <path
        d="M6 30V14.5C6 8.701 10.701 4 16.5 4H17.5C23.299 4 28 8.701 28 14.5V30"
        stroke="url(#lagenceGoldGrad)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner nested arch portal */}
      <path
        d="M13 30V16C13 13.7909 14.7909 12 17 12C19.2091 12 21 13.7909 21 16V30"
        stroke="url(#lagenceGoldGradInner)"
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
        stroke="url(#lagenceGoldGrad)"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
};

