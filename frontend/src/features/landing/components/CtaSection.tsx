import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

/** CTA (§6): a large centered card inviting sign-up. */
export function CtaSection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={REVEAL_VIEWPORT}>
        <Card className="relative overflow-hidden">
          <div
            className="bg-primary/15 pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-5 px-4 py-12 text-center">
            <h2 className="text-text-primary max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
              Start learning in the next minute
            </h2>
            <p className="text-text-secondary max-w-lg">
              Create a free account and take your first quiz today.
            </p>
            <Button size="lg" onClick={() => navigate(ROUTES.register)}>
              Create Account
            </Button>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
