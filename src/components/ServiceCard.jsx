import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const ServiceCard = ({ id, icon: Icon, title, description, price, badge }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative bg-card border border-border rounded-2xl p-6 shadow-elevation-sm hover:shadow-elevation-md transition-all flex flex-col h-full"
    >
      {badge && (
        <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold ${
          badge === 'Populaire' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
        }`}>
          {badge}
        </div>
      )}
      
      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <motion.div whileHover={{ rotate: 5 }}>
          <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
        </motion.div>
      </div>
      
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">{description}</p>
      
      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground block">À partir de</span>
          <span className="text-lg font-bold text-foreground">{price}</span>
        </div>
        <Link to={`/service/${id}`} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
};