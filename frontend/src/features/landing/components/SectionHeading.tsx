interface SectionHeadingProps {
  title: string;
  description?: string;
}

/**
 * Heading for a landing section. Local to the landing rather than the shared
 * `SectionHeader`, which is sized for dashboard panels — at that scale the
 * marketing sections read as sub-sections of nothing. Centred and set at
 * display size so every section on the page opens the same way.
 *
 * Set in the display serif, like the hero headline: the landing speaks in that
 * voice throughout, and the product stays in the interface sans.
 *
 * The heading gets the full width and the description is held to a narrower
 * column beneath it. Sharing one measure wrapped «Підготовка, зібрана в одному
 * місці» onto two lines long before the section ran out of room, and a heading
 * that breaks reads as two thoughts rather than one.
 *
 * The size steps down between `lg` and `xl` for the same reason: at 60px the
 * longest heading needs about 1000px and a 1024px window offers 960. Below
 * `lg` it wraps, which is what a heading of that length should do on a tablet.
 */
export function SectionHeading({ title, description }: SectionHeadingProps): React.JSX.Element {
  return (
    <div className="mx-auto mb-16 flex max-w-6xl flex-col gap-4 text-center">
      <h2 className="text-text-primary font-display text-4xl font-bold tracking-[-0.01em] text-balance sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="text-text-muted mx-auto max-w-3xl text-base text-balance sm:text-lg">{description}</p>
      )}
    </div>
  );
}
