'use client';

import { PageTransition, AnimatedSection } from '@/components/page-transitions';

interface JobPageWrapperProps {
  children: React.ReactNode;
  variant?: 'fade' | 'slide' | 'scale' | 'slideUp';
}

export function JobPageWrapper({ children, variant = 'slide' }: JobPageWrapperProps) {
  return (
    <PageTransition variant={variant} className="w-full">
      {children}
    </PageTransition>
  );
}

export function JobSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <AnimatedSection delay={delay} className="w-full">
      {children}
    </AnimatedSection>
  );
}
