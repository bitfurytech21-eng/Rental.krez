import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { KREZ_IMAGES } from '../../data/krezTemplateData';

interface KrezRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const KrezReveal: React.FC<KrezRevealProps> = ({
  children,
  delay = 0,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px 0px -30px 0px', amount: 0.12 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export interface KrezPropertyCardRevealProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  className?: string;
  enableHoverLift?: boolean;
}

export const KrezPropertyCardReveal: React.FC<KrezPropertyCardRevealProps> = ({
  children,
  index = 0,
  delay,
  className = '',
  enableHoverLift = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={`h-full ${className}`}>{children}</div>;
  }

  // Stagger calculation: subtle wave based on column offset (modulo 3) + minor row dampening
  const staggerDelay =
    delay !== undefined
      ? delay
      : (index % 3) * 0.07 + Math.min(Math.floor(index / 3) * 0.04, 0.2);

  return (
    <motion.div
      className={`h-full ${className}`}
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-20px 0px -40px 0px', amount: 0.08 }}
      transition={{
        duration: 0.55,
        delay: staggerDelay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={
        enableHoverLift
          ? {
              y: -5,
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
};

interface KrezImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const KrezImage: React.FC<KrezImageProps> = ({
  src,
  alt = '',
  fallbackSrc = KREZ_IMAGES.defaultProperty,
  className = '',
  loading = 'lazy',
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [hasErrored, setHasErrored] = useState(false);

  React.useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setHasErrored(false);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!hasErrored && imgSrc !== fallbackSrc) {
          setHasErrored(true);
          setImgSrc(fallbackSrc);
        }
      }}
      className={className}
      {...rest}
    />
  );
};
