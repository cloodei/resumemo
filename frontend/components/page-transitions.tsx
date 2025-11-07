'use client';

import { motion, spring } from 'motion/react';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'slide' | 'scale' | 'slideUp';
}

export function PageTransition({ 
  children, 
  className = '',
  variant = 'slideUp' 
}: PageTransitionProps) {
  const getVariantProps = () => {
    switch (variant) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.4 }
        };
      case 'slide':
        return {
          initial: { x: 30, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -30, opacity: 0 },
          transition: { type: spring, stiffness: 100, damping: 20 }
        };
      case 'scale':
        return {
          initial: { scale: 0.95, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.95, opacity: 0 },
          transition: { type: spring, stiffness: 150, damping: 25 }
        };
      case 'slideUp':
      default:
        return {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -20, opacity: 0 },
          transition: { type: spring, stiffness: 80, damping: 15 }
        };
    }
  };

  const props = getVariantProps();

  return (
    <motion.div
      initial={props.initial}
      animate={props.animate}
      exit={props.exit}
      transition={props.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const staggerContainerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const staggerItemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: spring, stiffness: 100, damping: 15 }
  }
};

export function StaggerContainer({ 
  children, 
  className = '',
  staggerDelay = 0.08
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={{
        ...staggerContainerVariants,
        animate: {
          ...staggerContainerVariants.animate,
          transition: {
            ...staggerContainerVariants.animate.transition,
            staggerChildren: staggerDelay
          }
        }
      }}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({ 
  children, 
  className = '',
  delay = 0 
}: AnimatedSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ 
        type: spring, 
        stiffness: 60, 
        damping: 15,
        delay 
      }}
      viewport={{ once: true, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
