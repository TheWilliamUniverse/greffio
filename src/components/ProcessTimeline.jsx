import React from 'react';
import { motion } from 'framer-motion';

export const ProcessTimeline = ({ steps }) => {
  return (
    <div className="relative max-w-4xl mx-auto py-12">
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border transform md:-translate-x-1/2" />
      
      <div className="space-y-12">
        {steps.map((step, index) => {
          const isEven = index % 2 === 0;
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="absolute left-4 md:left-1/2 w-8 h-8 rounded-full bg-primary border-4 border-background transform -translate-x-1/2 flex items-center justify-center z-10">
                <span className="text-primary-foreground text-xs font-bold">{index + 1}</span>
              </div>
              
              <div className={`ml-12 md:ml-0 md:w-1/2 ${isEven ? 'md:pl-12' : 'md:pr-12 text-left md:text-right'}`}>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-elevation-sm">
                  <div className={`flex items-center gap-3 mb-3 ${!isEven && 'md:justify-end'}`}>
                    <div className="p-2 bg-secondary rounded-lg text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">{step.description}</p>
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground`}>
                    ⏱ {step.duration}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};