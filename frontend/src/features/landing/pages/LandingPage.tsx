import { HeroSection } from '@/features/landing/components/HeroSection';
import { FeaturesSection } from '@/features/landing/components/FeaturesSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { BenefitsSection } from '@/features/landing/components/BenefitsSection';
import { PreviewSection } from '@/features/landing/components/PreviewSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';

/**
 * `/` (public) — the marketing landing page. One calm, premium, dark scrolling
 * page: hero, features, how-it-works, benefits, a preview built from the real
 * shared UI, a CTA, and the footer. Rendered outside PublicLayout so it can go
 * full-bleed; the CTAs route to /register and /login.
 */
export function LandingPage(): React.JSX.Element {
  return (
    <div className="bg-background text-text-primary min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <PreviewSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
