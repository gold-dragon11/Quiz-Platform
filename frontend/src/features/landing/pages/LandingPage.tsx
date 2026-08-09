import { HeroSection } from '@/features/landing/components/HeroSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { QuoteSection } from '@/features/landing/components/QuoteSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';

/**
 * `/` (public) — the marketing landing page. One calm, premium, dark scrolling
 * page: hero, how-it-works, a pull quote, a CTA, and the footer. Rendered
 * outside PublicLayout so it can go full-bleed; the CTAs route to /register
 * and /login.
 */
export function LandingPage(): React.JSX.Element {
  return (
    <div className="bg-background text-text-primary min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <QuoteSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
