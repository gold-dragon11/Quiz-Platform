import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Language } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useRegister, useResendVerification } from '@/features/auth/hooks/use-auth-mutations';
import { registerSchema, type RegisterFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';

/**
 * `/register` (guest-only). Creates an account (docs/04-api/authentication.md
 * §4), then shows a "check your email" confirmation — registration does not
 * establish a session; the account is Pending Verification until the emailed
 * link is used. 409 conflicts (email/username taken) and 400 validation errors
 * are surfaced inline on the offending field.
 *
 * The interface is Ukrainian-only, so the account's `preferredLanguage` is no
 * longer asked for: it is sent as UKRAINIAN. The field is optional on the
 * backend but defaults to ENGLISH there, so it has to be sent explicitly.
 *
 * A student's account or a teacher's is chosen here, once (decisions 17 and
 * 18): anyone may teach, and the two are separate accounts rather than a
 * switch. Student is the default because most people arriving are; a link
 * meant for teachers can open the form already switched with `?as=teacher`.
 */

type AccountRole = 'USER' | 'TEACHER';

const ROLE_CHOICES: { value: AccountRole; label: string; subtitle: string }[] = [
  {
    value: 'USER',
    label: 'Я учень',
    subtitle: 'Безкоштовно. Далі — лист на пошту, і можна проходити тести.',
  },
  {
    value: 'TEACHER',
    label: 'Я вчитель',
    subtitle: 'Групи, домашка й пробний НМТ для учнів. Далі — лист на пошту.',
  },
];

export function RegisterPage(): React.JSX.Element {
  const registerMutation = useRegister();
  const resend = useResendVerification();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<AccountRole>(searchParams.get('as') === 'teacher' ? 'TEACHER' : 'USER');
  const choice = ROLE_CHOICES.find((entry) => entry.value === role) ?? ROLE_CHOICES[0];

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(
      {
        email: values.email,
        username: values.username,
        password: values.password,
        preferredLanguage: Language.UKRAINIAN,
        role,
      },
      {
        onSuccess: () => setRegisteredEmail(values.email),
        onError: (error) =>
          applyApiErrorToForm(error, setError, {
            // Conflict errors come back in Ukrainian…
            'Ця електронна адреса': 'email',
            'Таке імʼя користувача': 'username',
            'Це імʼя користувача': 'username',
            // …validation messages still lead with the English field name.
            email: 'email',
            username: 'username',
            password: 'password',
          }),
      },
    );
  });

  if (registeredEmail) {
    return (
      <AuthCard
        title="Перевірте пошту"
        subtitle={`Ми надіслали посилання для підтвердження на ${registeredEmail}.`}
        footer={
          <p>
            Готові увійти?{' '}
            <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
              Перейти до входу
            </Link>
          </p>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert variant="success">
            Ваш акаунт створено. Перейдіть за посиланням у листі, щоб підтвердити адресу, а потім увійдіть.
          </Alert>
          <Button
            variant="secondary"
            fullWidth
            isLoading={resend.isPending}
            onClick={() =>
              resend.mutate(
                { email: registeredEmail },
                {
                  onSuccess: () =>
                    toast.success('Якщо адресу ще потрібно підтвердити, нове посилання вже в дорозі.'),
                  onError: () => toast.error('Зараз не вдалося надіслати. Спробуйте ще раз.'),
                },
              )
            }
          >
            Надіслати лист повторно
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Створення акаунта"
      subtitle={choice.subtitle}
      footer={
        <p>
          Уже маєте акаунт?{' '}
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Увійти
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* Two tabs on a rule rather than two cards: the choice is one word,
            and the form below it is the same either way. */}
        <div
          role="radiogroup"
          aria-label="Тип акаунта"
          className="border-border mb-2 grid grid-cols-2 border-b"
        >
          {ROLE_CHOICES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="radio"
              aria-checked={role === entry.value}
              onClick={() => setRole(entry.value)}
              className={`focus-visible:ring-primary -mb-px border-b-2 pb-3 text-sm outline-none transition-colors focus-visible:ring-2 ${
                role === entry.value
                  ? 'border-primary text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary border-transparent'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Input
          label="Електронна пошта"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Імʼя користувача"
          autoComplete="username"
          placeholder="your_username"
          helperText="Від 3 до 30 символів: латинські літери, цифри та підкреслення."
          error={errors.username?.message}
          {...register('username')}
        />
        <PasswordInput
          label="Пароль"
          autoComplete="new-password"
          helperText="Щонайменше 8 символів: велика й мала літери, цифра та спеціальний символ."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Підтвердіть пароль"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth isLoading={registerMutation.isPending}>
          Створити акаунт
        </Button>
      </form>
    </AuthCard>
  );
}
