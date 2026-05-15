import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export const TestimonialCard = ({ name, company, quote, rating = 5, initials }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-elevation-sm flex flex-col h-full"
    >
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
        ))}
      </div>
      
      <blockquote className="text-foreground text-sm leading-relaxed mb-6 flex-grow">
        "{quote}"
      </blockquote>
      
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
        <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{company}</p>
        </div>
      </div>
    </motion.div>
  );
};