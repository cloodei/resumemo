import { Footer } from '@/components/footer';
import { HeroAnimations } from '@/components/hero-animations';

export default function AppHero() {
  return (
    <>
      <section className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-[#0a0a0f] py-16 text-white">
        <div className="absolute inset-0 z-0 size-full [background:radial-gradient(ellipse_at_top,rgba(88,28,135,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1)_0%,transparent_50%)]"></div>
        <HeroAnimations />
      </section>
      <Footer />
    </>
  );
}
