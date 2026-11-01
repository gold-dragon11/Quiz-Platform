import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

/**
 * The frame both legal pages share: the wordmark home, the title, the edition
 * line, then the text in a measure a person can read to the end.
 */
export function LegalPage({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <article className="w-full max-w-2xl py-16">
      <Link
        to={ROUTES.home}
        aria-label="L&S, на головну"
        className="bg-primary text-on-primary focus-visible:ring-focus inline-flex h-10 items-center rounded-xl px-3 text-lg font-extrabold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        L&amp;S
      </Link>
      <h1 className="font-display text-text-primary mt-10 text-4xl leading-tight">{title}</h1>
      <p className="text-text-muted mt-3 text-sm">{meta}</p>
      <div className="border-border mt-8 border-t">{children}</div>
    </article>
  );
}

/** One numbered part of a legal page; the id makes it linkable. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-border scroll-mt-8 border-b py-8">
      <h2 id={`${id}-title`} className="text-text-primary font-display text-2xl">
        {title}
      </h2>
      <div className="text-text-secondary mt-4 flex flex-col gap-4 leading-relaxed">{children}</div>
    </section>
  );
}

/** A plain list inside a legal section. */
export function LegalList({ children }: { children: ReactNode }): React.JSX.Element {
  return <ul className="marker:text-text-muted flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

/** An inline link in legal text, internal or a mail address. */
export function LegalLink({ to, children }: { to: string; children: ReactNode }): React.JSX.Element {
  const className =
    'text-text-primary underline underline-offset-4 hover:text-primary active:text-primary focus-visible:ring-focus rounded-sm outline-none focus-visible:ring-2';
  return to.startsWith('mailto:') ? (
    <a href={to} className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
