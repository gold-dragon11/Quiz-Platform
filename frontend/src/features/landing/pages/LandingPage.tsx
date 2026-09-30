import { usePinnedTheme } from '@/shared/hooks/use-theme';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { HeroSection } from '@/features/landing/components/HeroSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { FeaturesSection } from '@/features/landing/components/FeaturesSection';
import { StatsSection } from '@/features/landing/components/StatsSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';

/**
 * `/` (public) — the marketing landing page. One calm, dark scrolling page:
 * a sticky bar, the hero with a test run beside it (below it on a phone), what
 * the product does beyond tests, the question bank, a closing CTA, and the
 * footer. Rendered outside PublicLayout so it can go full-bleed; every action
 * routes to /register or /login.
 *
 * Dark regardless of the reader's theme: the hero backdrop, the violet curves
 * and the mock test beside them are a drawing, not an interface, and they were
 * drawn for a dark page. The preference governs the product behind the login.
 */
export function LandingPage(): React.JSX.Element {
  usePinnedTheme('dark');

  return (
    <div className="bg-background text-text-primary min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <StatsSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
