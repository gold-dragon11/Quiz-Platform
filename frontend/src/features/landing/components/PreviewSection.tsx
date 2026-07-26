import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { StatCard } from '@/shared/ui/StatCard';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

/**
 * Preview (§5): static mockups composed from the real shared UI primitives —
 * not screenshots and not fake interfaces. Values are illustrative (matching
 * the PRD's own dashboard example) and no data is fetched. Reveals in a stagger
 * with a very subtle scroll parallax.
 */
export function PreviewSection(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader
        title="A calm interface, end to end"
        description="Built from the same components you'll use every day."
      />
      <motion.div ref={ref} style={{ y }}>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Dashboard">
              <DashboardPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Quiz">
              <QuizPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Statistics">
              <StatisticsPreview />
            </PreviewFrame>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-3">
      <span className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</span>
      <div className="h-full">{children}</div>
    </div>
  );
}

function DashboardPreview(): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar size="sm" fallback="A" />
        <div className="flex flex-col">
          <span className="text-text-primary text-sm font-medium">Welcome back, Alex</span>
          <span className="text-text-muted text-xs">@alex</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge tone="info">Level 8</Badge>
        <span className="text-text-secondary text-sm font-medium">2,430 XP</span>
      </div>
      <ProgressBar value={30} label="Progress to next level" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Quizzes" value="24" hint="Completed" />
        <StatCard label="Accuracy" value="88%" hint="Average" />
      </div>
    </Card>
  );
}

function QuizPreview(): React.JSX.Element {
  const options = [
    { text: 'A stateless HTTP protocol', selected: false },
    { text: 'A JSON Web Token', selected: true },
    { text: 'A database index', selected: false },
  ];
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs">Question 3 of 10</span>
        <Badge tone="warning">Intermediate</Badge>
      </div>
      <p className="text-text-primary text-sm font-medium">What does JWT stand for?</p>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <div
            key={option.text}
            className={`rounded-lg border px-3 py-2 text-sm ${
              option.selected
                ? 'border-primary bg-primary/10 text-text-primary'
                : 'border-border text-text-secondary'
            }`}
          >
            {option.text}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatisticsPreview(): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Study time" value="7h 20m" hint="Total" />
        <StatCard label="Correct" value="182" hint="Answers" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Mathematics</span>
          <span className="text-text-muted">92%</span>
        </div>
        <ProgressBar value={92} label="Mathematics accuracy" />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-secondary">History</span>
          <span className="text-text-muted">74%</span>
        </div>
        <ProgressBar value={74} label="History accuracy" />
      </div>
    </Card>
  );
}
