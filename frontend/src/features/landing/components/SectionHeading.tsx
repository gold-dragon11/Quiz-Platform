interface SectionHeadingProps {
  title: string;
  description?: string;
}

/**
 * Heading for a landing section. Local to the landing rather than the shared
 * `SectionHeader`, which is sized for dashboard panels — at that scale the
 * marketing sections read as sub-sections of nothing. Centred and set at
 * display size so every section on the page opens the same way; previously
 * some were left-aligned and small while others were centred and large.
 */
export function SectionHeading({ title, description }: SectionHeadingProps): React.JSX.Element {
  return (
    <div className="mx-auto mb-14 flex max-w-4xl flex-col gap-3 text-center">
      <h2 className="text-text-primary text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && <p className="text-text-muted text-base text-balance sm:text-lg">{description}</p>}
    </div>
  );
}
