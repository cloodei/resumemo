import { Footer } from '@/components/footer';
import { HeroAnimations } from '@/components/hero-animations';

export default function AppHero() {
  return (
    <>
      <section className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-linear-to-b from-black via-gray-950 to-black py-16 text-white sm:px-6 lg:px-8 lg:py-2">
        <div className="absolute inset-0 z-0 size-full rotate-180 items-center px-5 py-24 opacity-70 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#6366f1_100%)]"></div>
        <HeroAnimations />
      </section>
      <Footer />
    </>
  );
}
