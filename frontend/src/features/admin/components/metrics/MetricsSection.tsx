import { useAdminMetrics } from '@/features/admin/hooks/use-admin-metrics';
import { SectionError } from '@/features/admin/components/SectionError';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, formatShortDate, pluralUk } from '@/shared/utils/format';
import type {
  DailyPoint,
  MetricsFunnel,
  RecentAccount,
  SubjectUsage,
} from '@/features/admin/types/admin.types';

/**
 * `/admin?tab=overview` — how the platform is doing.
 *
 * First of the panel's sections, and deliberately so: editing a subject is
 * something you do once a month, while «is anything happening» is the reason
 * you opened the page at all.
 *
 * Everything here is read from rows the product already writes, so there is
 * nothing before registration: how many people saw the landing and left
 * cannot be known until anonymous visits leave a trace of their own. The
 * funnel therefore starts at «зареєструвались» rather than pretending.
 */
export function MetricsSection(): React.JSX.Element {
  const metrics = useAdminMetrics();

  if (metrics.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (metrics.isError) {
    return <SectionError onRetry={() => void metrics.refetch()} />;
  }

  const { totals, today, week, funnel, registrations, subjects, recent } = metrics.data;

  return (
    <div className="flex flex-col gap-14">
      <FigureGrid
        rule="bottom"
        figures={[
          {
            value: formatNumber(week.newAccounts),
            label: 'нових за тиждень',
            hint: `сьогодні — ${formatNumber(today.newAccounts)}`,
          },
          {
            value: formatNumber(week.activePeople),
            label: 'людей за тестами',
            hint: `сьогодні — ${formatNumber(today.activePeople)}`,
          },
          {
            value: formatNumber(week.testsCompleted),
            label: 'тестів за тиждень',
            hint: `сьогодні — ${formatNumber(today.testsCompleted)}`,
          },
        ]}
      />

      <p className="text-text-secondary text-sm">
        {/* «з них», not a dash: administrators are accounts too, so the two
            numbers deliberately do not add up to the total, and a dash would
            promise that they did. */}
        Усього {formatNumber(totals.accounts)} {pluralUk(totals.accounts, 'акаунт', 'акаунти', 'акаунтів')}, з
        них {formatNumber(totals.learners)} {pluralUk(totals.learners, 'учень', 'учні', 'учнів')} і{' '}
        {formatNumber(totals.teachers)} {pluralUk(totals.teachers, 'вчитель', 'вчителі', 'вчителів')}.
        Пройдено {formatNumber(totals.testsCompleted)}{' '}
        {pluralUk(totals.testsCompleted, 'тест', 'тести', 'тестів')} за весь час. Демо й видалені акаунти тут
        не рахуються.
      </p>

      <Funnel funnel={funnel} />
      <Registrations points={registrations} />
      <Subjects rows={subjects} />
      <Recent rows={recent} />
    </div>
  );
}

/* --- Funnel -------------------------------------------------------------- */

const FUNNEL_STEPS: { key: keyof MetricsFunnel; label: string }[] = [
  { key: 'registered', label: 'Зареєструвались' },
  { key: 'verified', label: 'Підтвердили пошту' },
  { key: 'tookATest', label: 'Пройшли тест' },
  { key: 'returned', label: 'Повернулись іншого дня' },
];

function Funnel({ funnel }: { funnel: MetricsFunnel }): React.JSX.Element {
  const top = funnel.registered;

  return (
    <section>
      <Heading title="Вирва" note="Усі, хто зареєструвався за 30 днів" />

      {top === 0 ? (
        <p className="text-text-muted mt-6 text-sm">
          За місяць ніхто не реєструвався, тож і міряти поки нічого.
        </p>
      ) : (
        <ol className="mt-6 flex flex-col gap-4">
          {FUNNEL_STEPS.map((step, index) => {
            const value = funnel[step.key];
            const previous = index === 0 ? value : funnel[FUNNEL_STEPS[index - 1].key];
            const lost = previous - value;

            return (
              <li key={step.key}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-text-secondary">{step.label}</span>
                  <span className="text-text-primary lining-nums font-medium">{formatNumber(value)}</span>
                </div>
                <div className="bg-surface-elevated mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.round((value / top) * 100)}%` }}
                  />
                </div>
                {/* The gap is the reading, so it is named rather than left to
                    be worked out from two numbers a line apart. */}
                {index > 0 && lost > 0 && (
                  <p className="text-text-muted mt-1.5 text-xs">тут втрачено {formatNumber(lost)}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* --- Registrations ------------------------------------------------------- */

function Registrations({ points }: { points: DailyPoint[] }): React.JSX.Element {
  const peak = Math.max(...points.map((point) => point.count), 1);
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <section>
      <Heading title="Реєстрації" note="За 30 днів" />

      {total === 0 ? (
        <p className="text-text-muted mt-6 text-sm">Жодної реєстрації за місяць.</p>
      ) : (
        <>
          {/* Every day is a column, including the empty ones — dropping them
              would turn a quiet fortnight into a gentle slope. */}
          <div className="border-border mt-6 flex h-28 items-end gap-[3px] border-b">
            {points.map((point) => (
              <div
                key={point.day}
                title={`${point.day} — ${point.count}`}
                className={`flex-1 rounded-t-[2px] ${point.count > 0 ? 'bg-primary' : 'bg-surface-elevated'}`}
                style={{ height: point.count > 0 ? `${Math.max(8, (point.count / peak) * 100)}%` : '2px' }}
              />
            ))}
          </div>
          <div className="text-text-muted mt-2 flex justify-between text-xs">
            <span>{points[0]?.day}</span>
            <span>
              разом {formatNumber(total)} · найбільше за день {formatNumber(peak)}
            </span>
            <span>{points[points.length - 1]?.day}</span>
          </div>
        </>
      )}
    </section>
  );
}

/* --- Subjects ------------------------------------------------------------ */

function Subjects({ rows }: { rows: SubjectUsage[] }): React.JSX.Element {
  const top = Math.max(...rows.map((row) => row.sessions), 1);

  return (
    <section>
      <Heading title="Предмети" note="Завершені тести за весь час" />

      {rows.length === 0 ? (
        <p className="text-text-muted mt-6 text-sm">Жодного завершеного тесту.</p>
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {rows.map((row) => (
            <li key={row.subject} className="py-4">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-text-primary">{row.subject}</span>
                <span className="text-text-muted lining-nums">
                  {formatNumber(row.sessions)} · {formatNumber(row.people)}{' '}
                  {pluralUk(row.people, 'людина', 'людини', 'людей')}
                </span>
              </div>
              <div className="bg-surface-elevated mt-2 h-1 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${Math.round((row.sessions / top) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --- Recent -------------------------------------------------------------- */

const ROLE_LABEL: Record<string, string> = {
  USER: 'учень',
  TEACHER: 'вчитель',
  ADMIN: 'адмін',
};

function Recent({ rows }: { rows: RecentAccount[] }): React.JSX.Element {
  return (
    <section>
      <Heading title="Останні акаунти" note="Найновіші згори" />

      {rows.length === 0 ? (
        <EmptyState
          title="Поки нікого"
          description="Коли хтось зареєструється, він зʼявиться тут — і одразу прилетить у Telegram."
          className="mt-6"
        />
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {rows.map((row) => (
            <li key={row.username} className="flex items-center justify-between gap-4 py-4 text-sm">
              <div className="min-w-0">
                <p className="text-text-primary truncate">
                  @{row.username}{' '}
                  <span className="text-text-muted">· {ROLE_LABEL[row.role] ?? row.role}</span>
                </p>
                <p className="text-text-muted mt-0.5 text-xs">{formatShortDate(row.createdAt)}</p>
              </div>
              {/* Two facts, and both are about whether the account became a
                  person: an unconfirmed address usually means a letter nobody
                  saw, and nobody who never sat a test has used the product. */}
              <div className="text-text-muted flex shrink-0 gap-3 text-xs">
                <span className={row.verified ? 'text-success' : 'text-warning'}>
                  {row.verified ? 'пошта' : 'без пошти'}
                </span>
                <span className={row.tookATest ? 'text-success' : ''}>
                  {row.tookATest ? 'тест' : 'без тесту'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --- Shared -------------------------------------------------------------- */

function Heading({ title, note }: { title: string; note: string }): React.JSX.Element {
  return (
    <div className="border-border flex items-baseline justify-between gap-4 border-b pb-3">
      <h3 className="text-text-muted text-xs tracking-[0.18em] uppercase">{title}</h3>
      <span className="text-text-muted text-xs">{note}</span>
    </div>
  );
}
