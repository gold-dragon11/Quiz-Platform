import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { StatCard } from '@/shared/ui/StatCard';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

/**
 * Preview (§5): static mockups composed from the real shared UI primitives —
 * not screenshots and not fake interfaces. Values are illustrative and no data
 * is fetched, but the sample question is taken verbatim from the seeded
 * History of Ukraine bank so the preview shows content the platform really has.
 * Reveals in a stagger with a very subtle scroll parallax.
 */
export function PreviewSection(): React.JSX.Element {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader title={t('landing.preview.title')} description={t('landing.preview.description')} />
      <motion.div ref={ref} style={{ y }}>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          <motion.div variants={fadeInUp}>
            <PreviewFrame label={t('landing.preview.frame.dashboard')}>
              <DashboardPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label={t('landing.preview.frame.quiz')}>
              <QuizPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label={t('landing.preview.frame.statistics')}>
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
  const { t } = useTranslation();
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar size="sm" fallback="A" />
        <div className="flex flex-col">
          <span className="text-text-primary text-sm font-medium">
            {t('landing.preview.dashboard.welcome')}
          </span>
          <span className="text-text-muted text-xs">@alex</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge tone="info">{t('landing.preview.dashboard.level')}</Badge>
        <span className="text-text-secondary text-sm font-medium">{t('landing.preview.dashboard.xp')}</span>
      </div>
      <ProgressBar value={30} label={t('landing.preview.dashboard.progress')} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('landing.preview.dashboard.quizzes')}
          value="24"
          hint={t('landing.preview.dashboard.quizzesHint')}
        />
        <StatCard
          label={t('landing.preview.dashboard.accuracy')}
          value="88%"
          hint={t('landing.preview.dashboard.accuracyHint')}
        />
      </div>
    </Card>
  );
}

function QuizPreview(): React.JSX.Element {
  const { t } = useTranslation();
  const options: { key: TranslationKey; selected: boolean }[] = [
    { key: 'landing.preview.quiz.option1', selected: true },
    { key: 'landing.preview.quiz.option2', selected: false },
    { key: 'landing.preview.quiz.option3', selected: false },
  ];

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs">{t('landing.preview.quiz.counter')}</span>
        <Badge tone="warning">{t('landing.preview.quiz.difficulty')}</Badge>
      </div>
      <p className="text-text-primary text-sm font-medium">{t('landing.preview.quiz.question')}</p>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <div
            key={option.key}
            className={`rounded-lg border px-3 py-2 text-sm ${
              option.selected
                ? 'border-primary bg-primary/10 text-text-primary'
                : 'border-border text-text-secondary'
            }`}
          >
            {t(option.key)}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatisticsPreview(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('landing.preview.stats.time')}
          value="7h 20m"
          hint={t('landing.preview.stats.timeHint')}
        />
        <StatCard
          label={t('landing.preview.stats.correct')}
          value="182"
          hint={t('landing.preview.stats.correctHint')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t('landing.preview.stats.mathematics')}</span>
          <span className="text-text-muted">92%</span>
        </div>
        <ProgressBar value={92} label={t('landing.preview.stats.mathematicsAccuracy')} />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t('landing.preview.stats.history')}</span>
          <span className="text-text-muted">74%</span>
        </div>
        <ProgressBar value={74} label={t('landing.preview.stats.historyAccuracy')} />
      </div>
    </Card>
  );
}
