import React from 'react';

interface TokenSymbolIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

export const TokenSymbolIcon: React.FC<TokenSymbolIconProps> = ({ 
  symbol, 
  className = "w-6 h-6", 
  size 
}) => {
  const sym = (symbol || '').toUpperCase().trim();
  const dimensionStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  switch (sym) {
    case 'BTC':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Bitcoin"
        >
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#FFFFFF"
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.922-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.745-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.792.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.148.986-5.319.695l.95-3.805c1.171.292 4.929.872 4.369 3.11zm.536-5.567c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.697 3.61 2.733z"
          />
        </svg>
      );

    case 'ETH':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Ethereum"
        >
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFFFFF" fillRule="nonzero">
            <path d="M16.498 4v8.87l7.497 3.35z" fillOpacity="0.6" />
            <path d="M16.498 4L9 16.22l7.498-3.35z" />
            <path d="M16.498 21.968v6.027L24 17.616z" fillOpacity="0.6" />
            <path d="M16.498 27.995v-6.028L9 17.616z" />
            <path d="M16.498 20.573l7.497-4.354-7.497-3.349z" fillOpacity="0.2" />
            <path d="M9 16.22l7.498 4.353v-7.702z" fillOpacity="0.6" />
          </g>
        </svg>
      );

    case 'USDT':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Tether USDT"
        >
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#FFFFFF"
            d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.17-6.79-1.025-6.79-2.052 0-1.026 2.902-1.882 6.79-2.052v3.256c.254.017.973.054 1.99.054 1.233 0 1.815-.045 1.923-.054V13.33c3.879.172 6.77 1.027 6.77 2.052 0 1.027-2.891 1.882-6.77 2.051v-.05zm0-4.33v-2.8h4.945V7.202h-13.73v3.05h4.843v2.798c-4.437.21-7.75 1.272-7.75 2.548 0 1.275 3.313 2.338 7.75 2.548v7.854h3.942v-7.85c4.428-.21 7.73-1.272 7.73-2.552 0-1.276-3.302-2.337-7.73-2.547z"
          />
        </svg>
      );

    case 'USDC':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="USD Coin"
        >
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <g fill="#FFFFFF">
            <path d="M16 6.857c-5.05 0-9.143 4.093-9.143 9.143 0 5.05 4.093 9.143 9.143 9.143 5.05 0 9.143-4.093 9.143-9.143 0-5.05-4.093-9.143-9.143-9.143zm0 16.571c-4.103 0-7.429-3.326-7.429-7.428 0-4.103 3.326-7.429 7.429-7.429s7.429 3.326 7.429 7.429c0 4.102-3.326 7.428-7.429 7.428z" opacity="0.3" />
            <path d="M17.429 11.429v-1.715h-2.858v1.715c-1.897.234-3.142 1.348-3.142 2.857 0 2.285 2.285 2.571 3.714 3.143 1.143.457 1.714.8 1.714 1.428 0 .686-.686 1.143-1.714 1.143-1.371 0-2.286-.571-2.629-1.486l-1.942.8c.457 1.486 1.828 2.514 3.714 2.8v1.714h2.858v-1.714c1.942-.286 3.142-1.486 3.142-2.971 0-2.057-1.828-2.629-3.714-3.2-1.029-.4-1.714-.686-1.714-1.371 0-.686.571-1.029 1.485-1.029 1.143 0 1.829.457 2.172 1.257l1.943-.8c-.458-1.371-1.6-2.286-3.286-2.571z" />
          </g>
        </svg>
      );

    case 'SOL':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Solana"
        >
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <defs>
            <linearGradient id="solana-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <g fill="url(#solana-grad)">
            <path d="M9.1 19.8l2.7-2.7c.3-.3.8-.5 1.2-.5h11.2c.7 0 1.1.8.6 1.3l-2.7 2.7c-.3.3-.8.5-1.2.5H9.7c-.7 0-1.1-.8-.6-1.3z" />
            <path d="M9.1 9.4l2.7-2.7c.3-.3.8-.5 1.2-.5h11.2c.7 0 1.1.8.6 1.3l-2.7 2.7c-.3.3-.8.5-1.2.5H9.7c-.7 0-1.1-.8-.6-1.3z" />
            <path d="M22.9 14.6l-2.7 2.7c-.3.3-.8.5-1.2.5H7.8c-.7 0-1.1-.8-.6-1.3l2.7-2.7c.3-.3.8-.5 1.2-.5h11.2c.7 0 1.1.8.6 1.3z" />
          </g>
        </svg>
      );

    case 'BNB':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="BNB Chain"
        >
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path
            fill="#FFFFFF"
            d="M16 6.5l3.1 3.1-4.7 4.7-4.7-4.7L16 6.5zm-6.6 6.6l1.6 1.6-3.1 3.1-1.6-1.6 3.1-3.1zm13.2 0l3.1 3.1-1.6 1.6-3.1-3.1 1.6-1.6zm-6.6 3.4l2.1 2.1-2.1 2.1-2.1-2.1 2.1-2.1zm-4.7 4.7l4.7 4.7 4.7-4.7-3.1-3.1-1.6 1.6-1.6-1.6-3.1 3.1z"
          />
        </svg>
      );

    case 'XRP':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="XRP Ripple"
        >
          <circle cx="16" cy="16" r="16" fill="#23292F" />
          <path
            fill="#FFFFFF"
            d="M23.9 8.2h2.2l-5.6 5.5c-2.4 2.4-6.4 2.4-8.8 0L6.1 8.2h2.2l4.5 4.4c1.8 1.8 4.7 1.8 6.5 0l4.6-4.4zm0 15.6l-4.6-4.4c-1.8-1.8-4.7-1.8-6.5 0l-4.5 4.4H6.1l5.6-5.5c2.4-2.4 6.4-2.4 8.8 0l5.6 5.5h-2.2z"
          />
        </svg>
      );

    case 'POL':
    case 'MATIC':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Polygon"
        >
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path
            fill="#FFFFFF"
            d="M20.9 13.7c-.5-.3-1.1-.3-1.6 0l-2.6 1.5-1.7 1-2.6 1.5c-.5.3-1.1.3-1.6 0l-2-1.2c-.5-.3-.8-.8-.8-1.4s.3-1.1.8-1.4l2-1.2c.5-.3 1.1-.3 1.6 0l2 1.2c.5.3.8.8.8 1.4v1.8l1.9-1.1v-1.8c0-.6-.3-1.1-.8-1.4l-3.9-2.2c-.5-.3-1.1-.3-1.6 0L7 12c-.5.3-.8.8-.8 1.4s.3 1.1.8 1.4l3.9 2.2c.5.3 1.1.3 1.6 0l2.6-1.5 1.7-1 2.6-1.5c.5-.3 1.1-.3 1.6 0l2 1.2c.5.3.8.8.8 1.4s-.3 1.1-.8 1.4l-2 1.2c-.5.3-1.1.3-1.6 0l-2-1.2c-.5-.3-.8-.8-.8-1.4v-1.8l-1.9 1.1v1.8c0 .6.3 1.1.8 1.4l3.9 2.2c.5.3 1.1.3 1.6 0l3.9-2.2c.5-.3.8-.8.8-1.4s-.3-1.1-.8-1.4l-3.9-2.2z"
          />
        </svg>
      );

    case 'AVAX':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Avalanche"
        >
          <circle cx="16" cy="16" r="16" fill="#E84142" />
          <path
            fill="#FFFFFF"
            d="M17.8 7.3c-.8-1.4-2.8-1.4-3.6 0L7.4 20.8c-.8 1.4.2 3.2 1.8 3.2h4.5c.8 0 1.5-.4 1.9-1.1l1.4-2.6 1.4 2.6c.4.7 1.1 1.1 1.9 1.1h2.3c.7 0 1.2-.7.9-1.3L17.8 7.3zm-1.8 4.7l3.6 6.8h-7.2l3.6-6.8z"
          />
        </svg>
      );

    case 'TRX':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="TRON"
        >
          <circle cx="16" cy="16" r="16" fill="#EF0027" />
          <path
            fill="#FFFFFF"
            d="M8.2 8.7l14.4 3.7-6.2 12.8L8.2 8.7zm2.4 2.4l5.9 8.2 4.1-8.5-10-2.3v2.6zm6.3 9.4l-4.4-6.1-1.3 7.5 5.7-1.4z"
          />
        </svg>
      );

    case 'TON':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Toncoin"
        >
          <circle cx="16" cy="16" r="16" fill="#0098EA" />
          <path
            fill="#FFFFFF"
            d="M16 7l8.5 6.2-3.2 11.8H10.7L7.5 13.2 16 7zm0 2.8l-5.8 4.2 2.2 8.2h7.2l2.2-8.2L16 9.8zm0 3.2l3.8 2.8-3.8 5-3.8-5 3.8-2.8z"
          />
        </svg>
      );

    case 'ADA':
      return (
        <svg 
          viewBox="0 0 32 32" 
          className={`shrink-0 ${className}`} 
          style={dimensionStyle}
          aria-label="Cardano"
        >
          <circle cx="16" cy="16" r="16" fill="#0033AD" />
          <g fill="#FFFFFF">
            <circle cx="16" cy="16" r="3" />
            <circle cx="16" cy="8" r="1.5" />
            <circle cx="16" cy="24" r="1.5" />
            <circle cx="8" cy="16" r="1.5" />
            <circle cx="24" cy="16" r="1.5" />
            <circle cx="10.3" cy="10.3" r="1.2" />
            <circle cx="21.7" cy="10.3" r="1.2" />
            <circle cx="10.3" cy="21.7" r="1.2" />
            <circle cx="21.7" cy="21.7" r="1.2" />
          </g>
        </svg>
      );

    default:
      return (
        <div 
          className={`rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[10px] shrink-0 ${className}`}
          style={dimensionStyle}
        >
          {sym.slice(0, 3)}
        </div>
      );
  }
};

/**
 * Optional network brand icon renderer for multi-chain badges
 */
export const NetworkBadgeIcon: React.FC<{ networkName: string; className?: string }> = ({ 
  networkName = '', 
  className = "w-3.5 h-3.5" 
}) => {
  const net = networkName.toLowerCase();

  if (net.includes('erc20') || net.includes('ethereum')) {
    return <TokenSymbolIcon symbol="ETH" className={className} />;
  }
  if (net.includes('trc20') || net.includes('tron')) {
    return <TokenSymbolIcon symbol="TRX" className={className} />;
  }
  if (net.includes('polygon') || net.includes('matic') || net.includes('pos')) {
    return <TokenSymbolIcon symbol="POL" className={className} />;
  }
  if (net.includes('bep20') || net.includes('bnb') || net.includes('bsc') || net.includes('binance')) {
    return <TokenSymbolIcon symbol="BNB" className={className} />;
  }
  if (net.includes('solana') || net.includes('spl')) {
    return <TokenSymbolIcon symbol="SOL" className={className} />;
  }
  if (net.includes('bitcoin') || net.includes('segwit') || net.includes('taproot') || net.includes('btc')) {
    return <TokenSymbolIcon symbol="BTC" className={className} />;
  }
  if (net.includes('arbitrum')) {
    return (
      <span className={`rounded-full bg-[#28A0F0] text-white font-extrabold text-[8px] flex items-center justify-center ${className}`}>
        ARB
      </span>
    );
  }
  if (net.includes('optimism')) {
    return (
      <span className={`rounded-full bg-[#FF0420] text-white font-extrabold text-[8px] flex items-center justify-center ${className}`}>
        OP
      </span>
    );
  }
  if (net.includes('base')) {
    return (
      <span className={`rounded-full bg-[#0052FF] text-white font-extrabold text-[8px] flex items-center justify-center ${className}`}>
        BASE
      </span>
    );
  }
  if (net.includes('avalanche') || net.includes('avax')) {
    return <TokenSymbolIcon symbol="AVAX" className={className} />;
  }
  if (net.includes('ton')) {
    return <TokenSymbolIcon symbol="TON" className={className} />;
  }
  if (net.includes('ripple') || net.includes('xrp')) {
    return <TokenSymbolIcon symbol="XRP" className={className} />;
  }
  if (net.includes('cardano') || net.includes('ada')) {
    return <TokenSymbolIcon symbol="ADA" className={className} />;
  }

  return (
    <span className={`rounded-full bg-emerald-600 text-white font-extrabold text-[8px] flex items-center justify-center ${className}`}>
      NET
    </span>
  );
};
