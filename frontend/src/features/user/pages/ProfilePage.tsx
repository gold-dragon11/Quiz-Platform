import { AccountStatus } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { AccountAvatar } from '@/features/user/components/AccountAvatar';
import { useMyAccount, useMyAvatar } from '@/features/user/hooks/use-account-queries';

const STATUS_TONE: Record<AccountStatus, BadgeTone> = {
  [AccountStatus.ACTIVE]: 'success',
  [AccountStatus.PENDING_VERIFICATION]: 'warning',
  [AccountStatus.SUSPENDED]: 'error',
  [AccountStatus.DELETED]: 'error',
};

function humanizeStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * `/profile` (RequireAuth). Shows the authenticated user's account overview —
 * avatar, email, account status, email-verified state, and join date — from
 * GET /users/me and GET /users/me/avatar (docs/04-api/users.md §4, §10).
 */
export function ProfilePage(): React.JSX.Element {
  const account = useMyAccount();
  const avatar = useMyAvatar();

  if (account.isPending) {
    return <ProfileSkeleton />;
  }

  if (account.isError) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Alert variant="error" title="Couldn't load your profile">
          Something went wrong while loading your account. Please try again.
        </Alert>
        <div>
          <Button variant="secondary" onClick={() => void account.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { email, accountStatus, emailVerified, createdAt } = account.data;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-text-primary mb-6 text-2xl font-semibold">Profile</h1>
      <Card>
        <div className="flex items-center gap-4">
          <AccountAvatar imageUrl={avatar.data?.imageUrl} fallback={email.charAt(0)} />
          <div className="min-w-0">
            <p className="text-text-primary truncate text-lg font-medium">{email}</p>
            <Badge tone={STATUS_TONE[accountStatus]}>{humanizeStatus(accountStatus)}</Badge>
          </div>
        </div>

        <dl className="border-border mt-6 flex flex-col gap-4 border-t pt-6">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted text-sm">Email</dt>
            <dd className="text-text-secondary text-sm">{email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted text-sm">Account status</dt>
            <dd>
              <Badge tone={STATUS_TONE[accountStatus]}>{humanizeStatus(accountStatus)}</Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted text-sm">Email verified</dt>
            <dd>
              {emailVerified ? (
                <Badge tone="success">Verified</Badge>
              ) : (
                <Badge tone="warning">Not verified</Badge>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted text-sm">Member since</dt>
            <dd className="text-text-secondary text-sm">{formatDate(createdAt)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="mb-6 h-8 w-40" />
      <Card>
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="border-border mt-6 flex flex-col gap-4 border-t pt-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
