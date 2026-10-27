import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /**
   * A fact about what the page shows — a date, a deadline, the group and its
   * subject — set as a caption under the title. Never a name for the section
   * the page belongs to: that line said nothing the navigation did not.
   */
  meta?: ReactNode;
  /** One or two sentences, held to a narrow measure under the title. */
  lead?: string;
}

/**
 * How a screen opens.
 *
 * Deliberately not the shared `SectionHeader`: that one is sized for panels
 * inside a page, and using it as a page title left every screen starting with
 * a 24px line indistinguishable from the sections beneath it — the flat,
 * everything-the-same-weight look that makes an interface read as generated
 * rather than designed.
 *
 * The title in the display serif at its one weight, a hairline under the
 * block, and nothing above it. The small tracked capitals that used to
 * announce each page («АКАУНТ», «ВАШІ ЦИФРИ») were the eyebrow, the line a
 * machine puts over every heading; where one carried a fact, the fact moved
 * under the title as `meta`.
 */
export function PageHeader({ title, meta, lead }: PageHeaderProps): React.JSX.Element {
  return (
    <header className="border-border border-b pb-8">
      <h1 className="text-text-primary font-display text-4xl tracking-[-0.01em] lining-nums sm:text-5xl">
        {title}
      </h1>
      {meta && <p className="label mt-3">{meta}</p>}
      {lead && <p className="text-text-secondary mt-4 max-w-2xl text-base text-pretty sm:text-lg">{lead}</p>}
    </header>
  );
}
