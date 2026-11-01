import { ROUTES } from '@/shared/constants/routes';
import { LegalLink, LegalList, LegalPage, LegalSection } from '@/features/legal/components/LegalPage';
import { PRIVACY_CONTACT_EMAIL } from '@/features/legal/constants';

/**
 * `/delete-account` — public. App stores ask for a web page that tells a
 * person how to delete their account without installing anything, and the
 * person who needs it most is the one who can no longer sign in, so the page
 * covers that case too.
 */
export function DeleteAccountInfoPage(): React.JSX.Element {
  const subject = encodeURIComponent('Видалення акаунта L&S');
  const mail = `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${subject}`;

  return (
    <LegalPage title="Видалення акаунта" meta="L&S, learn-ls.com">
      <LegalSection id="in-app" title="Якщо ви можете увійти">
        <ol className="marker:text-text-muted flex list-decimal flex-col gap-2 pl-5">
          <li>
            <LegalLink to={ROUTES.login}>Увійдіть</LegalLink> у свій акаунт.
          </li>
          <li>Відкрийте «Налаштування» (у меню профілю).</li>
          <li>
            Унизу, у розділі «Видалення акаунта», позначте, що розумієте наслідки, і натисніть «Видалити мій
            акаунт».
          </li>
        </ol>
        <p>Акаунт видаляється одразу, а всі сесії на всіх пристроях завершуються.</p>
      </LegalSection>

      <LegalSection id="no-access" title="Якщо увійти не виходить">
        <p>
          Забули пароль? <LegalLink to={ROUTES.forgotPassword}>Відновіть його</LegalLink>, а тоді видаліть
          акаунт у налаштуваннях.
        </p>
        <p>
          Якщо доступу до пошти теж немає, напишіть на{' '}
          <LegalLink to={mail}>{PRIVACY_CONTACT_EMAIL}</LegalLink> і вкажіть імʼя користувача. Ми можемо
          попросити підтвердити, що акаунт ваш, і видалимо його протягом 30 днів.
        </p>
      </LegalSection>

      <LegalSection id="what-goes" title="Що відбувається з даними">
        <LegalList>
          <li>
            Стираються електронна адреса, імʼя, імʼя користувача, опис, аватар, пароль, вибрані предмети й
            сесії.
          </li>
          <li>
            Відповіді й результати лишаються без звʼязку з вами, щоб не ламалися статистика питань та історія
            груп. У вчителя й суперників ви будете «Видалений користувач».
          </li>
          <li>Зареєструватися з тією ж адресою знову можна, але це буде новий акаунт без історії.</li>
        </LegalList>
        <p>
          Докладніше в <LegalLink to={`${ROUTES.privacy}#keep`}>політиці приватності</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
