import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} bg-primary rounded-lg`}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 180],
          borderRadius: ["20%", "50%", "20%"]
        }}
        transition={{
          duration: 1.5,
          ease: "easeInOut",
          times: [0, 0.5, 1],
          repeat: Infinity,
        }}
      />
    </div>
  );
};