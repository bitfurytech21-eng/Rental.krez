import React from 'react';

interface ButtonLoaderProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({ text = 'Processing...', className = '', size = 'sm' }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const radius = size === 'sm' ? '6px' : '9px';

  return (
    <div className={`inline-flex items-center justify-center gap-2 select-none ${className}`}>
      <div className="relative w-5 h-5 animate-spin flex items-center justify-center">
        {[...Array(6)].map((_, i) => {
          const angle = (i * 360) / 6;
          // Vary opacity and glow for the flowing rotation effect
          const opacity = 0.2 + (i / 5) * 0.8;
          return (
            <div
              key={i}
              className={`absolute ${dotSize} rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF,0_0_4px_#38BDF8]`}
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${angle}deg) translate(${radius}, -50%)`,
                opacity: opacity,
              }}
            />
          );
        })}
      </div>
      {text && (
        <span className="text-xs font-bold uppercase tracking-wider text-white animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
};
