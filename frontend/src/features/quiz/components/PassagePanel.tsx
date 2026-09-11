import { useEffect, useRef } from 'react';
import type { PassageView } from '@/features/quiz/types/quiz.types';
import { EmphasisText } from '@/shared/ui/EmphasisText';

/** A numbered gap as authored: `(3) ______`. */
const GAP = /\((\d{1,2})\)\s*_{3,}/g;

interface PassagePanelProps {
  passage: PassageView;
  /**
   * The gap the current question fills, marked in the text. Null for a
   * question about the text as a whole, and for a text without gaps.
   */
  activeGap?: number | null;
  className?: string;
}

/**
 * The text a group of questions is asked about (docs/02-domain/passage.md).
 *
 * Gaps are drawn the way the paper prints them — a number in brackets over a
 * line — and the one the current question is about is marked, so the reader
 * never has to count down a paragraph to find gap four. When the text is
 * longer than its box, the box (never the page) scrolls to that gap: on a
 * phone the question sits below, and moving the whole page up to the text
 * would take the options out of view.
 */
export function PassagePanel({
  passage,
  activeGap = null,
  className = '',
}: PassagePanelProps): React.JSX.Element {
  const boxRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || activeGap === null || box.scrollHeight <= box.clientHeight) {
      return;
    }
    const gap = box.querySelector<HTMLElement>(`[data-gap="${activeGap}"]`);
    if (!gap) {
      return;
    }
    const top = gap.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 48) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [activeGap, passage.id]);

  return (
    <article
      ref={boxRef}
      aria-label={passage.title ?? 'Текст до завдань'}
      className={`relative ${className}`}
    >
      {passage.title && <h3 className="text-text-primary mb-4 text-base font-medium">{passage.title}</h3>}
      <div className="text-text-secondary text-[15px] leading-7 whitespace-pre-wrap">
        {withGaps(passage.content, activeGap)}
      </div>
    </article>
  );
}

function withGaps(content: string, activeGap: number | null): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of content.matchAll(GAP)) {
    const start = match.index ?? 0;
    const number = Number(match[1]);
    const active = number === activeGap;
    parts.push(<EmphasisText key={`text-${start}`}>{content.slice(last, start)}</EmphasisText>);
    parts.push(
      <span
        key={start}
        data-gap={number}
        // Inline, with no side margin: the text around a gap carries its own
        // spaces, and any extra would push the comma after it away — "(2) ___ ,".
        className={`rounded px-0.5 tabular-nums transition-colors ${
          active ? 'bg-primary/15 text-primary font-medium' : 'text-text-muted'
        }`}
      >
        ({number})
        <span
          aria-hidden="true"
          className={`ml-1 inline-block w-10 border-b ${active ? 'border-primary' : 'border-text-muted/60'}`}
        />
      </span>,
    );
    last = start + match[0].length;
  }
  parts.push(<EmphasisText key="text-end">{content.slice(last)}</EmphasisText>);
  return parts;
}
