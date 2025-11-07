import { HeroAnimations } from '@/components/hero-animations';
import { Footer } from '@/components/footer';
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  LifeBuoy,
  ShieldCheck,
  Database,
  Sparkles,
} from 'lucide-react';

export default function AppHero() {
  const quickLinks = [
    {
      title: 'Dashboard',
      description: 'Review searches, shortlists, and insights in one view.',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Create a job',
      description: 'Spin up a new role and invite your hiring partners.',
      href: '/jobs/new',
      icon: FilePlus,
    },
    {
      title: 'Pricing',
      description: 'Choose a plan that scales with your hiring volume.',
      href: '/pricing',
      icon: BookOpen,
    },
    {
      title: 'Support',
      description: 'Browse guides or reach our team any time you need help.',
      href: '/support',
      icon: LifeBuoy,
    },
  ];

  const features = [
    {
      title: 'Precise shortlists',
      description: 'Our ranking engine surfaces the clearest fit with full reasoning.',
      icon: Database,
    },
    {
      title: 'Human-friendly AI',
      description: 'Readable summaries help recruiters align quickly with hiring managers.',
      icon: Sparkles,
    },
    {
      title: 'Confident decisions',
      description: 'Risk signals and compliance checks keep your pipeline clean.',
      icon: ShieldCheck,
    },
  ];

  const steps = [
    {
      title: 'Upload resumes',
      description: 'Bulk import or sync directly from your ATS in seconds.',
    },
    {
      title: 'Set criteria',
      description: 'Define must-haves, culture fit signals, and ideal experience.',
    },
    {
      title: 'Review matches',
      description: 'Compare candidates with side-by-side insights tailored to your team.',
    },
    {
      title: 'Share and decide',
      description: 'Send curated shortlists to stakeholders and move faster together.',
    },
  ];

  const testimonials = [
    { value: '78%', label: 'Less time screening' },
    { value: '40%', label: 'Higher interview-to-offer' },
    { value: '24h', label: 'Avg. time to shortlist' },
  ];

  return (
    <>
      <section className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black py-16 text-white sm:px-6 lg:px-8 lg:py-2">
        <div className="absolute inset-0 z-0 size-full rotate-180 items-center px-5 py-24 opacity-80 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]"></div>
        <HeroAnimations 
          quickLinks={quickLinks}
          features={features}
          steps={steps}
          testimonials={testimonials}
        />
      </section>
      <Footer />
    </>
  );
}
