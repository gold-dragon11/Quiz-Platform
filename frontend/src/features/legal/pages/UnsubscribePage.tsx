import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Spinner } from '@/shared/ui/Spinner';
import { LegalLink, LegalPage } from '@/features/legal/components/LegalPage';
import { userApi } from '@/features/user/api/user.api';

/**
 * `/unsubscribe?token=…` — where the link at the bottom of the mistakes email
 * lands (decision 48). Public: the reader may be signed out or on another
 * device. It switches the email off as soon as it opens, because that is what
 * the click asked for; the API is called from here, by a POST, and not by the
 * link itself, so a mail scanner that fetches every link turns nothing off.
 */
export function UnsubscribePage(): React.JSX.Element {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const unsubscribe = useMutation({ mutationFn: (value: string) => userApi.unsubscribe(value) });
  const sent = useRef(false);

  useEffect(() => {
    // Once, even under StrictMode's double effect.
    if (token && !sent.current) {
      sent.current = true;
      unsubscribe.mutate(token);
    }
  }, [token, unsubscribe]);

  const failed = !token || unsubscribe.isError;

  return (
    <LegalPage title="Листи про помилки" meta="L&S, learn-ls.com">
      <div className="text-text-secondary py-8 leading-relaxed" role="status">
        {failed ? (
          <p>
            Посилання не спрацювало: можливо, його скопійовано не повністю. Вимкнути листи можна в{' '}
            <LegalLink to={ROUTES.settings}>налаштуваннях</LegalLink> після входу.
          </p>
        ) : unsubscribe.isSuccess ? (
          <p>
            Готово, листи «помилки чекають» більше не приходитимуть. Увімкнути їх знову можна в{' '}
            <LegalLink to={ROUTES.settings}>налаштуваннях</LegalLink>.
          </p>
        ) : (
          <p className="flex items-center gap-3">
            <Spinner /> Вимикаємо листи…
          </p>
        )}
      </div>
    </LegalPage>
  );
}
