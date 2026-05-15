import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const PricingCard = ({ title, price, description, features, isPopular, onSelect }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col h-full bg-card rounded-2xl p-8 shadow-elevation-sm hover:shadow-elevation-md transition-shadow ${
        isPopular ? 'border-2 border-primary ring-4 ring-primary/10' : 'border border-border'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase">
          LE PLUS POPULAIRE
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm h-10">{description}</p>
      </div>
      
      <div className="mb-8">
        <span className="text-4xl font-extrabold text-foreground">{price}</span>
        {price !== 'Sur devis' && <span className="text-muted-foreground"> HT</span>}
      </div>
      
      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <Check className="h-5 w-5 text-primary shrink-0 mr-3" />
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        onClick={onSelect}
        variant={isPopular ? 'default' : 'outline'} 
        className="w-full mt-auto"
        size="lg"
      >
        Commencer
      </Button>
    </motion.div>
  );
};
