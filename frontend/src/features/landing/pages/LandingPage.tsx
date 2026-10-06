import { usePinnedTheme } from '@/shared/hooks/use-theme';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { HeroSection } from '@/features/landing/components/HeroSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { MistakeLadderSection } from '@/features/landing/components/MistakeLadderSection';
import { MockExamSection } from '@/features/landing/components/MockExamSection';
import { DuelSection } from '@/features/landing/components/DuelSection';
import { TutorsSection } from '@/features/landing/components/TutorsSection';
import { StatsSection } from '@/features/landing/components/StatsSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';
import '@/features/landing/landing.css';

/**
 * `/` (public) — the marketing landing page. A sticky bar, the hero with a
 * stack of exam sheets, then one scene per thing the product does: how a test
 * goes, the mistake ladder, the mock exam, live duels, the tutor side, the
 * bank, and a closing call to action. Rendered outside PublicLayout so it can
 * go full-bleed; every action routes to /register or /login.
 *
 * The scenes are axonometric drawings in CSS 3D with the product's real text
 * on their faces, played by the scroll: pinned on a wide screen, held under the
 * bar on a phone, still with reduced motion. See docs/05-frontend/landing.md.
 *
 * Dark regardless of the reader's theme: the drawings were made for a dark
 * page. The preference governs the product behind the login.
 *
 * `overflow-x: clip` rather than `hidden`: the drawings reach past the column
 * on narrow screens, and `hidden` would make this a scroll container and break
 * every sticky element inside it.
 */
export function LandingPage(): React.JSX.Element {
  usePinnedTheme('dark');

  return (
    <div className="lp bg-background text-text-primary min-h-screen overflow-x-clip">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <MistakeLadderSection />
        <MockExamSection />
        <DuelSection />
        <TutorsSection />
        <StatsSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
