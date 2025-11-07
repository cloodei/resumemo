'use client';

import { PageTransition, AnimatedSection } from '@/components/page-transitions';
import { ReactNode } from 'react';

interface JobPageWrapperProps {
  children: ReactNode;
  variant?: 'fade' | 'slide' | 'scale' | 'slideUp';
}

export function JobPageWrapper({ children, variant = 'slide' }: JobPageWrapperProps) {
  return (
    <PageTransition variant={variant} className="w-full">
      {children}
    </PageTransition>
  );
}

export function JobSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <AnimatedSection delay={delay} className="w-full">
      {children}
    </AnimatedSection>
  );
}
