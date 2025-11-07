import { HeroSimple } from '@/components/hero-simple';
import { FooterSimple } from '@/components/footer-simple';

export default function AppHero() {
  return (
    <>
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background py-16">
        <HeroSimple />
      </section>
      <FooterSimple />
    </>
  );
}
