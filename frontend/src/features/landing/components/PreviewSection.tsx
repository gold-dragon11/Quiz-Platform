import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { StatCard } from '@/shared/ui/StatCard';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * Preview (§5): static mockups composed from the real shared UI primitives —
 * not screenshots and not fake interfaces. Values are illustrative and no data
 * is fetched, but the sample question is taken verbatim from the seeded
 * History of Ukraine bank so the preview shows content the platform really has.
 * Reveals in a stagger with a very subtle scroll parallax.
 */
export function PreviewSection(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  return (
    <section className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
      <SectionHeading
        title="Спокійний інтерфейс від початку до кінця"
        description="Зібраний з тих самих компонентів, якими ти користуватимешся щодня."
      />
      <motion.div ref={ref} style={{ y }}>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Головна">
              <DashboardPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Тест">
              <QuizPreview />
            </PreviewFrame>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <PreviewFrame label="Статистика">
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
    <div className="flex h-full flex-col gap-4">
      <span className="text-text-muted text-sm font-medium tracking-wide uppercase">{label}</span>
      <div className="h-full">{children}</div>
    </div>
  );
}

function DashboardPreview(): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-5 p-7">
      <div className="flex items-center gap-4">
        <Avatar size="md" fallback="О" />
        <div className="flex flex-col">
          <span className="text-text-primary text-base font-medium">З поверненням, Олексію</span>
          <span className="text-text-muted text-sm">@oleksii</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge tone="info">Рівень 8</Badge>
        <span className="text-text-secondary text-base font-medium">2 430 XP</span>
      </div>
      <ProgressBar value={30} label="Прогрес до наступного рівня" />
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Тести" value="24" hint="Пройдено" />
        <StatCard label="Точність" value="88%" hint="Середня" />
      </div>
    </Card>
  );
}

function QuizPreview(): React.JSX.Element {
  const options = [
    { text: '1648 р.', selected: true },
    { text: '1654 р.', selected: false },
    { text: '1638 р.', selected: false },
  ];

  return (
    <Card className="flex h-full flex-col gap-5 p-7">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-sm">Питання 3 з 10</span>
        <Badge tone="warning">Середній</Badge>
      </div>
      <p className="text-text-primary text-lg leading-snug font-medium">
        У якому році розпочалася Національно-визвольна війна під проводом Богдана Хмельницького?
      </p>
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <div
            key={option.text}
            className={`rounded-lg border px-4 py-3 text-base ${
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
    <Card className="flex h-full flex-col gap-5 p-7">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Час навчання" value="7 год 20 хв" hint="Усього" />
        <StatCard label="Правильних" value="182" hint="Відповідей" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-base">
          <span className="text-text-secondary">Математика</span>
          <span className="text-text-muted">92%</span>
        </div>
        <ProgressBar value={92} label="Точність з математики" />
        <div className="mt-3 flex items-center justify-between text-base">
          <span className="text-text-secondary">Історія України</span>
          <span className="text-text-muted">74%</span>
        </div>
        <ProgressBar value={74} label="Точність з історії України" />
      </div>
    </Card>
  );
}
