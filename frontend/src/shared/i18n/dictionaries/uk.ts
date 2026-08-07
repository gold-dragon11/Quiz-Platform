/**
 * Ukrainian dictionary — the source of truth for the key set. Every other
 * dictionary is typed as `Record<TranslationKey, string>`, so a missing or
 * misspelt key is a compile error rather than a blank label at runtime.
 *
 * Keys are flat and dot-namespaced by surface (`landing.*`, `auth.*`, …).
 * `{placeholders}` are interpolated by `t()`.
 */
export const uk = {
  // ---- Language switcher --------------------------------------------------
  'lang.label': 'Мова інтерфейсу',
  'lang.uk': 'УКР',
  'lang.en': 'ENG',
  'lang.uk.full': 'Українська',
  'lang.en.full': 'English',

  // ---- Landing: hero ------------------------------------------------------
  'landing.hero.headline': 'Вчись Прогресуй Повторюй',
  // The space before the em dash is non-breaking (U+00A0): Ukrainian
  // typography never starts a line with a dash, and the balanced wrap would
  // otherwise push it to the front of the second line.
  'landing.hero.subheadline':
    'Спокійний і зосереджений спосіб опанувати будь-який предмет — тренуйся на тестах, стеж за прогресом і підвищуй рівень.',
  'landing.hero.cta.primary': 'Зареєструватись',
  'landing.hero.cta.secondary': 'Увійти',

  // ---- Landing: features --------------------------------------------------
  'landing.features.title': 'Усе потрібне для якісного навчання',
  'landing.features.description': 'Небагато інструментів, але зроблених як слід.',
  'landing.features.quiz.title': 'Тестування',
  'landing.features.quiz.description':
    'Відточуй знання на завданнях з однією правильною відповіддю та на відповідностях.',
  'landing.features.stats.title': 'Статистика',
  'landing.features.stats.description':
    'Бачиш точність, час навчання та результати за кожним предметом з першого погляду.',
  'landing.features.progress.title': 'Відстеження прогресу',
  'landing.features.progress.description':
    'Спостерігай, як зростають рівень і досвід — кожен тест рухає тебе вперед.',
  'landing.features.gamification.title': 'Гейміфікація',
  'landing.features.gamification.description':
    'Заробляй досвід, підвищуй рівень і тримай мотивацію завдяки стриманим винагородам.',

  // ---- Landing: how it works ---------------------------------------------
  'landing.how.title': 'Як це працює',
  'landing.how.description': 'Три кроки — і ти вже навчаєшся.',
  'landing.how.step1.title': 'Обери предмет',
  'landing.how.step1.description': 'Переглянь предмети й теми та вибери те, що хочеш потренувати.',
  'landing.how.step2.title': 'Пройди тест',
  'landing.how.step2.description': 'Відповідай на питання у власному темпі, за бажанням — із таймером.',
  'landing.how.step3.title': 'Покращуй результат',
  'landing.how.step3.description': 'Переглядай свої відповіді, заробляй досвід і стеж за прогресом у часі.',

  // ---- Landing: preview ---------------------------------------------------
  'landing.preview.title': 'Спокійний інтерфейс від початку до кінця',
  'landing.preview.description': 'Зібраний з тих самих компонентів, якими ти користуватимешся щодня.',
  'landing.preview.frame.dashboard': 'Головна',
  'landing.preview.frame.quiz': 'Тест',
  'landing.preview.frame.statistics': 'Статистика',
  'landing.preview.dashboard.welcome': 'З поверненням, Олексію',
  'landing.preview.dashboard.level': 'Рівень 8',
  'landing.preview.dashboard.xp': '2 430 XP',
  'landing.preview.dashboard.progress': 'Прогрес до наступного рівня',
  'landing.preview.dashboard.quizzes': 'Тести',
  'landing.preview.dashboard.quizzesHint': 'Пройдено',
  'landing.preview.dashboard.accuracy': 'Точність',
  'landing.preview.dashboard.accuracyHint': 'Середня',
  'landing.preview.quiz.counter': 'Питання 3 з 10',
  'landing.preview.quiz.difficulty': 'Середній',
  // Taken verbatim from the seeded History of Ukraine bank (hetmanate topic),
  // so the preview shows a question the platform actually contains.
  'landing.preview.quiz.question':
    'У якому році розпочалася Національно-визвольна війна під проводом Богдана Хмельницького?',
  'landing.preview.quiz.option1': '1648 р.',
  'landing.preview.quiz.option2': '1654 р.',
  'landing.preview.quiz.option3': '1638 р.',
  'landing.preview.stats.time': 'Час навчання',
  'landing.preview.stats.timeHint': 'Усього',
  'landing.preview.stats.correct': 'Правильних',
  'landing.preview.stats.correctHint': 'Відповідей',
  'landing.preview.stats.mathematics': 'Математика',
  'landing.preview.stats.history': 'Історія України',
  'landing.preview.stats.mathematicsAccuracy': 'Точність з математики',
  'landing.preview.stats.historyAccuracy': 'Точність з історії України',

  // ---- Landing: CTA + footer ---------------------------------------------
  'landing.cta.title': 'Почни навчатися вже за хвилину',
  'landing.cta.description': 'Створи безкоштовний акаунт і пройди свій перший тест сьогодні.',
  'landing.cta.button': 'Створити акаунт',
  'landing.footer.tagline': 'Вчись Прогресуй Повторюй',
  'landing.footer.login': 'Вхід',
  'landing.footer.register': 'Реєстрація',
  'landing.footer.rights': '© {year} L&S. Усі права захищено.',

  // ---- Auth: shared -------------------------------------------------------
  'auth.field.email': 'Електронна пошта',
  'auth.field.emailPlaceholder': 'you@example.com',
  'auth.field.password': 'Пароль',
  'auth.field.username': "Ім'я користувача",
  'auth.field.usernamePlaceholder': 'your_username',
  'auth.field.usernameHint': 'Від 3 до 30 символів: літери, цифри та підкреслення.',
  'auth.field.passwordHint': 'Щонайменше 8 символів: велика й мала літери, цифра та спеціальний символ.',
  'auth.field.confirmPassword': 'Підтвердіть пароль',
  'auth.field.preferredLanguage': 'Бажана мова',
  'auth.language.english': 'Англійська',
  'auth.language.ukrainian': 'Українська',

  // ---- Auth: login --------------------------------------------------------
  'auth.login.title': 'Вхід',
  'auth.login.subtitle': 'З поверненням до L&S',
  'auth.login.submit': 'Увійти',
  'auth.login.forgot': 'Забули пароль?',
  'auth.login.noAccount': 'Ще не маєте акаунта?',
  'auth.login.createOne': 'Створити',
  'auth.login.notVerified': 'Не підтвердили пошту?',
  'auth.login.resend': 'Надіслати лист повторно',
  'auth.login.welcomeToast': 'З поверненням!',

  // ---- Auth: register -----------------------------------------------------
  'auth.register.title': 'Створення акаунта',
  'auth.register.subtitle': 'Почни навчатися з L&S',
  'auth.register.submit': 'Створити акаунт',
  'auth.register.hasAccount': 'Уже маєте акаунт?',
  'auth.register.signIn': 'Увійти',
  'auth.register.checkEmail.title': 'Перевірте пошту',
  'auth.register.checkEmail.subtitle': 'Ми надіслали посилання для підтвердження на {email}.',
  'auth.register.checkEmail.alert':
    'Ваш акаунт створено. Перейдіть за посиланням у листі, щоб підтвердити адресу, а потім увійдіть.',
  'auth.register.checkEmail.resend': 'Надіслати лист повторно',
  'auth.register.checkEmail.ready': 'Готові увійти?',
  'auth.register.checkEmail.goToLogin': 'Перейти до входу',
  'auth.register.resendSuccess': 'Якщо адресу ще потрібно підтвердити, нове посилання вже в дорозі.',
  'auth.register.resendError': 'Зараз не вдалося надіслати. Спробуйте ще раз.',

  // ---- Auth: forgot / reset password --------------------------------------
  'auth.forgot.title': 'Забули пароль?',
  'auth.forgot.subtitle': 'Ми надішлемо на пошту посилання для відновлення.',
  'auth.forgot.submit': 'Надіслати посилання',
  'auth.forgot.remembered': 'Згадали пароль?',
  'auth.forgot.backToLogin': 'Повернутися до входу',
  'auth.forgot.sent.title': 'Перевірте пошту',
  'auth.forgot.sent.alert':
    'Якщо акаунт для {email} існує, ми надіслали посилання для зміни пароля. Скористайтеся ним найближчим часом, бо воно діє обмежений час.',
  'auth.reset.title': 'Новий пароль',
  'auth.reset.subtitle': 'Оберіть надійний пароль, який не використовуєте деінде.',
  'auth.reset.newPassword': 'Новий пароль',
  'auth.reset.confirmPassword': 'Підтвердіть новий пароль',
  'auth.reset.submit': 'Змінити пароль',
  'auth.reset.invalid.title': 'Недійсне посилання',
  'auth.reset.invalid.alert':
    'У цьому посиланні для зміни пароля бракує токена або воно пошкоджене. Будь ласка, запросіть нове.',
  'auth.reset.invalid.request': 'Запросити нове посилання',
  'auth.reset.done.title': 'Пароль змінено',
  'auth.reset.done.alert': 'Ваш пароль змінено, а всі активні сеанси завершено. Увійдіть з новим паролем.',

  // ---- Auth: email verification -------------------------------------------
  'auth.verify.pending.title': 'Підтверджуємо пошту',
  'auth.verify.pending.subtitle': 'Це займе лише мить.',
  'auth.verify.success.title': 'Пошту підтверджено',
  'auth.verify.success.alert': 'Вашу електронну адресу підтверджено. Тепер ви можете увійти в акаунт.',
  'auth.verify.success.continue': 'Перейти до входу',
  'auth.verify.failed.title': 'Не вдалося підтвердити',
  'auth.verify.failed.hint': 'Запросіть нове посилання для підтвердження:',
  'auth.verify.failed.submit': 'Надіслати нове посилання',
  'auth.verify.alreadyVerified': 'Уже підтвердили?',
  'auth.verify.signIn': 'Увійти',
  'auth.resend.title': 'Підтвердження пошти',
  'auth.resend.subtitle': 'Введіть свою адресу, щоб отримати нове посилання для підтвердження.',
  'auth.resend.submit': 'Надіслати лист повторно',
  'auth.resend.sent':
    'Якщо {email} зареєстровано й адресу ще потрібно підтвердити, нове посилання вже в дорозі.',
} as const;

export type TranslationKey = keyof typeof uk;
