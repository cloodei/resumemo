'use client';

import { PageTransition, StaggerContainer, StaggerItem } from '@/components/page-transitions';
import { ReactNode } from 'react';

export function DashboardPageWrapper({ children }: { children: ReactNode }) {
  return (
    <PageTransition variant="slideUp" className="w-full">
      <StaggerContainer>
        {children}
      </StaggerContainer>
    </PageTransition>
  );
}
