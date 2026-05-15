export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export const glow = {
  initial: { boxShadow: "0 0 0 rgba(30, 58, 110, 0)" },
  hover: { boxShadow: "0 10px 30px rgba(30, 58, 110, 0.2)", transition: { duration: 0.3 } }
};

export const cardHover = {
  rest: { y: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" },
  hover: { y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2, ease: "easeOut" } }
};

export const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 24
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { duration: 0.3, ease: "easeOut" } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20, 
    transition: { duration: 0.2, ease: "easeIn" } 
  }
};