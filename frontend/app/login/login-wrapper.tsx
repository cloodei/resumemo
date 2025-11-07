'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

export function LoginPageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: 'easeOut'
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
