import { useEffect, useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { AccountStatus } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Textarea } from '@/shared/ui/Textarea';
import { applyApiErrorToForm, isApiError } from '@/shared/utils/apply-api-error';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { useResendVerification } from '@/features/auth/hooks/use-auth-mutations';
import { AccountAvatar } from '@/features/user/components/AccountAvatar';
import { useUpdateProfile } from '@/features/user/hooks/use-account-mutations';
import { editProfileSchema, type EditProfileFormValues } from '@/features/user/validation/user.schemas';
import type { CurrentUser } from '@/shared/types/auth';

/** What a non-active status means for the reader, in their own words. */
const STATUS_NOTE: Partial<Record<AccountStatus, string>> = {
  [AccountStatus.PENDING_VERIFICATION]:
    'Акаунт чекає на підтвердження пошти. Доки цього не сталося, частина розділів недоступна.',
  [AccountStatus.SUSPENDED]: 'Акаунт призупинено. Напишіть нам, щоб зрозуміти причину й відновити доступ.',
  [AccountStatus.DELETED]: 'Акаунт видалено. Дані збережені, але доступу до них більше немає.',
};

function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * `/profile` (RequireAuth) — who you are on the platform.
 *
 * The card this replaced printed the email twice and the account status twice:
 * once beside the avatar and once again in a list below it, because the list
 * was built from every field `/users/me` returns rather than from what the
 * reader needs. Stripped of the repetition it had two lines left, which is
 * what a page shows when its content is somebody else's fields.
 *
 * So it now reads and writes the profile proper. `PATCH /users/me/profile` has
 * existed since Phase 5 and no screen had ever called it: the display name the
 * sidebar greets the reader by was set once at registration and could not be
 * changed anywhere in the interface.
 *
 * It also drops both of its own requests. `/auth/me` is loaded app-wide and
 * already carries the identity, the avatar and the verification state, so
 * `/users/me` and `/users/me/avatar` were two extra round trips for data the
 * cache already held.
 *
 * Two fields are shown only when they say something. «Активний» is the state
 * of every account that can read this page, so a badge for it is decoration; a
 * suspended or unverified one gets a sentence explaining what it means. And an
 * unverified email is an action, not a warning — the reader is signed in, so
 * we know the address and never make them retype it.
 */
export function ProfilePage(): React.JSX.Element {
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return <ProfileSkeleton />;
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Акаунт" title="Профіль" />
        <p className="border-error text-text-secondary mt-10 border-l pl-5 text-sm">
          Не вдалося завантажити акаунт.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-primary underline underline-offset-4"
          >
            Спробувати ще раз
          </button>
        </p>
      </div>
    );
  }

  return <ProfileView user={user} />;
}

function ProfileView({ user }: { user: CurrentUser }): React.JSX.Element {
  const statusNote = STATUS_NOTE[user.accountStatus];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Акаунт" title="Профіль" />

      <div className="mt-12 flex items-center gap-5">
        {/* The initial follows the display name, the way the sidebar's avatar
            does — taken from the email here, the same account showed two
            different letters on one screen. */}
        <AccountAvatar
          imageUrl={user.avatar?.imageUrl}
          fallback={(user.profile?.displayName ?? user.email).charAt(0)}
        />
        <div className="min-w-0">
          <p className="text-text-primary truncate text-lg">{user.profile?.displayName ?? user.email}</p>
          {/* Nick and address stack below `sm`. On one line with `truncate`
              a 390px screen cut the email — «claude@example.…» — and the
              address is the half a reader actually needs to check. */}
          <p className="text-text-muted mt-1 text-sm">
            {user.profile && <span className="block sm:inline">@{user.profile.username}</span>}
            {user.profile && <span className="hidden sm:inline"> · </span>}
            <span className="block break-all sm:inline">{user.email}</span>
          </p>
        </div>
      </div>

      <p className="text-text-muted mt-6 text-sm">З нами з {formatJoinDate(user.createdAt)}</p>

      {user.profile && (
        <PublicProfileNote
          username={user.profile.username}
          enabled={user.settings?.publicProfileEnabled ?? true}
        />
      )}

      {statusNote && (
        <p className="border-warning text-text-secondary mt-10 max-w-xl border-l pl-5 text-sm">
          {statusNote}
        </p>
      )}

      {!user.emailVerified && <VerificationBlock email={user.email} />}

      {user.profile && (
        <EditProfileSection
          displayName={user.profile.displayName}
          bio={user.profile.bio}
          readOnly={user.isDemo}
        />
      )}

      <p className="text-text-muted mt-16 text-sm">
        Пароль і видалення акаунта —{' '}
        <Link to={ROUTES.settings} className="text-text-secondary underline underline-offset-4">
          у налаштуваннях
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Where the public page lives, and a way to pass it on. When the page is
 * hidden the line says so instead, so nobody copies a link that shows a 404.
 */
function PublicProfileNote({ username, enabled }: { username: string; enabled: boolean }): React.JSX.Element {
  const path = generatePath(ROUTES.publicProfile, { username });

  if (!enabled) {
    return (
      <p className="text-text-muted mt-2 text-sm">
        Публічний профіль приховано —{' '}
        <Link to={ROUTES.settings} className="text-text-secondary underline underline-offset-4">
          показати в налаштуваннях
        </Link>
        .
      </p>
    );
  }

  const copy = (): void => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`).then(
      () => toast.success('Посилання скопійовано.'),
      () => toast.error('Не вдалося скопіювати. Скопіюйте адресу вручну.'),
    );
  };

  return (
    <p className="text-text-muted mt-2 text-sm">
      Публічний профіль:{' '}
      <Link to={path} className="text-text-secondary break-all underline underline-offset-4">
        {window.location.host}
        {path}
      </Link>
      <button type="button" onClick={copy} className="text-primary ml-3 underline underline-offset-4">
        Скопіювати
      </button>
    </p>
  );
}

function VerificationBlock({ email }: { email: string }): React.JSX.Element {
  const resend = useResendVerification();

  return (
    <section className="border-border mt-12 border-t pt-8">
      <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Підтвердження пошти</h2>
      <p className="text-text-secondary mt-4 max-w-xl text-sm">
        На {email} ми надіслали лист із посиланням. Якщо він не дійшов, перевірте теку зі спамом або надішліть
        новий — попереднє посилання після цього перестане діяти.
      </p>
      <button
        type="button"
        disabled={resend.isPending}
        onClick={() =>
          resend.mutate(
            { email },
            {
              onSuccess: () => toast.success(`Лист надіслано на ${email}.`),
              onError: (error) =>
                toast.error(
                  isApiError(error) ? error.message : 'Не вдалося надіслати лист. Спробуйте пізніше.',
                ),
            },
          )
        }
        className="text-primary mt-5 text-sm underline underline-offset-4 disabled:opacity-60"
      >
        {resend.isPending ? 'Надсилаємо…' : 'Надіслати лист ще раз'}
      </button>
    </section>
  );
}

/**
 * The two fields the reader can actually change.
 *
 * Collapsed, it shows only the bio: the name and the @username are already in
 * the header a few lines above, and repeating them in a list underneath is the
 * same duplication this page was rewritten to remove.
 *
 * The username is not editable here at all — it is the address of the public
 * profile, so renaming it breaks links already shared, and that needs a
 * confirmation step this screen does not have.
 */
function EditProfileSection({
  displayName,
  bio,
  readOnly,
}: {
  displayName: string;
  bio: string | null;
  /** A demo account: the API refuses the change, so it is not offered. */
  readOnly: boolean;
}): React.JSX.Element {
  const updateProfile = useUpdateProfile();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { displayName, bio: bio ?? '' },
  });

  // The server is the source of truth: after a save the query refetches, and
  // the form has to follow it rather than keep the values it happened to send.
  useEffect(() => {
    reset({ displayName, bio: bio ?? '' });
  }, [displayName, bio, reset]);

  const onSubmit = handleSubmit((values) => {
    updateProfile.mutate(
      // An empty bio is cleared with an explicit null; '' would store a blank.
      { displayName: values.displayName, bio: values.bio.trim() === '' ? null : values.bio },
      {
        onSuccess: () => {
          toast.success('Профіль оновлено.');
          setOpen(false);
        },
        onError: (error) =>
          applyApiErrorToForm(error, setError, {
            'display name': 'displayName',
            bio: 'bio',
          }),
      },
    );
  });

  if (!open) {
    return (
      <section className="border-border mt-12 border-t pt-8">
        <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Про себе</h2>
        <p className={`mt-4 max-w-xl text-sm ${bio ? 'text-text-secondary' : 'text-text-muted'}`}>
          {bio ??
            'Ви ще нічого про себе не написали. Опис бачать викладачі у ваших групах і всі, хто відкриє ваш публічний профіль.'}
        </p>
        {readOnly ? (
          <p className="text-text-muted mt-6 text-sm">
            Імʼя та опис демо-акаунта змінити не можна — щоночі він повертається до початкового стану.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-primary mt-6 text-sm underline underline-offset-4"
          >
            Змінити імʼя або опис
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="border-border mt-12 border-t pt-8">
      <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Як вас видно</h2>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Input
          label="Імʼя"
          helperText="Так вас називає застосунок; його бачать викладачі у групах і всі на публічному профілі."
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Textarea
          label="Про себе"
          rows={3}
          helperText="До 250 символів. Можна лишити порожнім."
          error={errors.bio?.message}
          {...register('bio')}
        />
        <div className="flex items-center gap-6">
          <Button type="submit" isLoading={updateProfile.isPending} disabled={!isDirty}>
            Зберегти
          </Button>
          <button
            type="button"
            onClick={() => {
              reset({ displayName, bio: bio ?? '' });
              setOpen(false);
            }}
            className="text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            Скасувати
          </button>
        </div>
      </form>
    </section>
  );
}

function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-12 w-56" />
      <div className="mt-12 flex items-center gap-5">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="mt-12 h-40" />
    </div>
  );
}
