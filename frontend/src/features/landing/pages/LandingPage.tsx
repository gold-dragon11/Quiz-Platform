import { LandingNav } from '@/features/landing/components/LandingNav';
import { HeroSection } from '@/features/landing/components/HeroSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { StatsSection } from '@/features/landing/components/StatsSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';

/**
 * `/` (public) — the marketing landing page. One calm, dark scrolling page:
 * a sticky bar, the hero, how-it-works, the size of the question bank, a
 * closing CTA, and the footer. Rendered outside PublicLayout so it can go
 * full-bleed; every action routes to /register or /login.
 */
export function LandingPage(): React.JSX.Element {
  return (
    <div className="bg-background text-text-primary min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <StatsSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
