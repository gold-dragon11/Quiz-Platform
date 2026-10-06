import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCatalogue } from '@/features/landing/hooks/use-catalogue';
import { useCountUp } from '@/features/landing/hooks/use-count-up';
import { useInView } from '@/features/landing/hooks/use-in-view';
import { formatCount, plural } from '@/features/landing/lib/scene-math';
import { SECTION_CONTAINER } from '@/features/landing/constants';

interface FigureProps {
  value: number;
  forms: readonly [string, string, string];
  lead?: boolean;
  start: boolean;
}

function Figure({ value, forms, lead = false, start }: FigureProps): React.JSX.Element {
  const shown = useCountUp(value, start);
  return (
    <div
      className={`border-border pb-7 ${
        lead
          ? 'col-span-full min-[900px]:col-span-1'
          : 'border-l pl-7 [&:nth-child(2)]:border-l-0 [&:nth-child(2)]:pl-0 min-[900px]:[&:nth-child(2)]:border-l min-[900px]:[&:nth-child(2)]:pl-7'
      }`}
    >
      <span
        className={`lp-num block leading-[0.9] font-bold ${
          lead ? 'text-[clamp(80px,9vw,136px)] whitespace-nowrap' : 'text-[clamp(40px,4.4vw,64px)]'
        }`}
      >
        {formatCount(shown)}
      </span>
      <small className="text-text-muted mt-3.5 block text-xs leading-snug font-medium tracking-[0.16em] uppercase">
        {plural(value, forms)}
      </small>
    </div>
  );
}

/**
 * The bank, in three figures from `GET /catalogue`: the questions lead and the
 * subjects and topics stay small beside them.
 *
 * Live numbers, not hand-kept ones: the bank grows, and a figure typed into the
 * page would fall behind it in silence. Materials are left out on purpose —
 * every topic has exactly one, so «76 тем» and «76 матеріалів» would be the
 * same fact counted twice.
 *
 * The whole section goes when the catalogue cannot be read, heading included:
 * a label over nothing looks broken rather than quiet.
 */
export function StatsSection(): React.JSX.Element | null {
  const catalogue = useCatalogue();
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, 0.6, true);
  const reduced = useReducedMotion() ?? false;
  const start = inView && !reduced;

  if (catalogue.isError) {
    return null;
  }

  return (
    <section aria-labelledby="bank-title" className="border-border border-t py-[clamp(64px,8vw,110px)]">
      <div className={SECTION_CONTAINER}>
        <p id="bank-title" className="lp-label mb-8">
          Банк питань
        </p>

        {catalogue.isPending ? (
          <Skeleton className="h-36" />
        ) : (
          <div
            ref={gridRef}
            className="border-border grid grid-cols-2 items-end gap-y-7 border-b min-[900px]:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]"
          >
            <Figure
              lead
              start={start}
              value={catalogue.data.totalQuestions}
              forms={['опубліковане питання', 'опубліковані питання', 'опублікованих питань']}
            />
            <Figure
              start={start}
              value={catalogue.data.subjects.length}
              forms={['предмет', 'предмети', 'предметів']}
            />
            <Figure start={start} value={catalogue.data.totalTopics} forms={['тема', 'теми', 'тем']} />
          </div>
        )}
      </div>
    </section>
  );
}
