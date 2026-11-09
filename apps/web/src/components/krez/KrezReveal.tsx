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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
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
