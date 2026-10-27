import { LandingNav } from '@/features/landing/components/LandingNav';
import { HeroSection } from '@/features/landing/components/HeroSection';
import { ProductStack } from '@/features/landing/components/ProductStack';
import { MistakeLadderSection } from '@/features/landing/components/MistakeLadderSection';
import { MockExamSection } from '@/features/landing/components/MockExamSection';
import { DuelSection } from '@/features/landing/components/DuelSection';
import { TutorsSection } from '@/features/landing/components/TutorsSection';
import { BankSection } from '@/features/landing/components/BankSection';
import { FaqSection } from '@/features/landing/components/FaqSection';
import { CtaSection } from '@/features/landing/components/CtaSection';
import { FooterSection } from '@/features/landing/components/FooterSection';
import '@/features/landing/landing.css';

/**
 * `/` — the public landing page (docs/05-frontend/landing.md, decision 42).
 *
 * Hallmark's Feature Stack in the Loom system the product uses: a masthead,
 * a Banner hero with the exam's own sheets, the product at work as a pinned
 * run of its real screens, then each mechanism in the form its facts take —
 * the ladder as a scale of days, the mock paper as a specification, the duel
 * as status rows, the tutor's report as a table, the bank from the
 * catalogue — the questions, and the hero's action on an indigo band.
 *
 * It follows the reader's theme like every other screen; it used to be
 * pinned to dark, because its drawings were made for a dark page.
 */
export function LandingPage(): React.JSX.Element {
  return (
    <div className="lp bg-background text-text-primary min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <ProductStack />
        <MistakeLadderSection />
        <MockExamSection />
        <DuelSection />
        <TutorsSection />
        <BankSection />
        <FaqSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
