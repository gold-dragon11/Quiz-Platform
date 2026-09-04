interface PageHeaderProps {
  /** Small letterspaced line above the title — the section a page belongs to. */
  eyebrow: string;
  title: string;
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
 * Three sizes instead of one, a hairline instead of a box, and the title set
 * in the display serif — the same voice the landing page speaks in. The rest
 * of the interface stays in the sans; the serif is reserved for titles and for
 * figures, which is what makes it read as a system rather than a decoration.
 */
export function PageHeader({ eyebrow, title, lead }: PageHeaderProps): React.JSX.Element {
  return (
    <header className="border-border border-b pb-8">
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">{eyebrow}</p>
      <h1 className="text-text-primary font-display mt-3 text-4xl font-bold tracking-[-0.01em] lining-nums sm:text-5xl">
        {title}
      </h1>
      {lead && <p className="text-text-secondary mt-4 max-w-2xl text-base text-pretty sm:text-lg">{lead}</p>}
    </header>
  );
}
