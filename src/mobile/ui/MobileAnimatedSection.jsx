import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';

export const MobileAnimatedSection = ({ children, className, delay = 0, id, as = 'section' }) => {
  const { reveal } = useMobileMotion();
  const Tag = motion[as] || motion.section;

  return (
    <Tag id={id} className={cn(className)} {...reveal(delay)}>
      {children}
    </Tag>
  );
};

export const MobileAnimatedList = ({ items, renderItem, className }) => {
  const { staggerItem } = useMobileMotion();

  return (
    <div className={className}>
      {items.map((item, index) => (
        <motion.div key={item.id || item.key || index} {...staggerItem(index)}>
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  );
};
