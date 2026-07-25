import type { PropsWithChildren, ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

interface AuthCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  /** Optional links/actions rendered below the card body (e.g. "Sign in"). */
  footer?: ReactNode;
}

/**
 * Shared shell for every auth screen — a centered card with a heading, an
 * optional subtitle, the form body, and an optional footer. Composes the
 * shared Card primitive; PublicLayout centers it in the viewport.
 */
export function AuthCard({ title, subtitle, footer, children }: AuthCardProps): React.JSX.Element {
  return (
    <div className="w-full max-w-md">
      <Card>
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-text-primary text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
        </div>
        {children}
      </Card>
      {footer && <div className="text-text-muted mt-6 text-center text-sm">{footer}</div>}
    </div>
  );
}
