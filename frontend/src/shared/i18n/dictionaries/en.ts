import type { TranslationKey } from './uk';

/**
 * English dictionary. Typed against the Ukrainian key set, so adding a key to
 * `uk` without adding it here fails the type check.
 */
export const en: Record<TranslationKey, string> = {
  // ---- Language switcher --------------------------------------------------
  'lang.label': 'Interface language',
  'lang.uk': 'УКР',
  'lang.en': 'ENG',
  'lang.uk.full': 'Українська',
  'lang.en.full': 'English',

  // ---- Landing: hero ------------------------------------------------------
  'landing.hero.headline': 'Learn Progress Repeat',
  'landing.hero.subheadline':
    'A calm, focused way to master any subject — practice with quizzes, track your progress, and level up as you go.',
  'landing.hero.cta.primary': 'Sign up',
  'landing.hero.cta.secondary': 'Login',

  // ---- Landing: features --------------------------------------------------
  'landing.features.title': 'Everything you need to learn well',
  'landing.features.description': 'A small set of tools, done properly.',
  'landing.features.quiz.title': 'Quiz Practice',
  'landing.features.quiz.description':
    'Sharpen your knowledge with focused single-choice and matching quizzes.',
  'landing.features.stats.title': 'Statistics',
  'landing.features.stats.description': 'See accuracy, study time, and per-subject performance at a glance.',
  'landing.features.progress.title': 'Progress Tracking',
  'landing.features.progress.description': 'Watch your level and XP climb as every quiz moves you forward.',
  'landing.features.gamification.title': 'Gamification',
  'landing.features.gamification.description':
    'Earn XP, level up, and stay motivated with subtle, satisfying rewards.',

  // ---- Landing: how it works ---------------------------------------------
  'landing.how.title': 'How it works',
  'landing.how.description': "Three steps, and you're learning.",
  'landing.how.step1.title': 'Choose Subject',
  'landing.how.step1.description': 'Browse subjects and topics and pick what you want to practice.',
  'landing.how.step2.title': 'Solve Quiz',
  'landing.how.step2.description': 'Answer focused questions at your own pace, with an optional timer.',
  'landing.how.step3.title': 'Improve Results',
  'landing.how.step3.description': 'Review your answers, earn XP, and track progress over time.',

  // ---- Landing: preview ---------------------------------------------------
  'landing.preview.title': 'A calm interface, end to end',
  'landing.preview.description': "Built from the same components you'll use every day.",
  'landing.preview.frame.dashboard': 'Dashboard',
  'landing.preview.frame.quiz': 'Quiz',
  'landing.preview.frame.statistics': 'Statistics',
  'landing.preview.dashboard.welcome': 'Welcome back, Alex',
  'landing.preview.dashboard.level': 'Level 8',
  'landing.preview.dashboard.xp': '2,430 XP',
  'landing.preview.dashboard.progress': 'Progress to next level',
  'landing.preview.dashboard.quizzes': 'Quizzes',
  'landing.preview.dashboard.quizzesHint': 'Completed',
  'landing.preview.dashboard.accuracy': 'Accuracy',
  'landing.preview.dashboard.accuracyHint': 'Average',
  'landing.preview.quiz.counter': 'Question 3 of 10',
  'landing.preview.quiz.difficulty': 'Intermediate',
  'landing.preview.quiz.question':
    'In which year did the National Liberation War led by Bohdan Khmelnytsky begin?',
  'landing.preview.quiz.option1': '1648',
  'landing.preview.quiz.option2': '1654',
  'landing.preview.quiz.option3': '1638',
  'landing.preview.stats.time': 'Study time',
  'landing.preview.stats.timeHint': 'Total',
  'landing.preview.stats.correct': 'Correct',
  'landing.preview.stats.correctHint': 'Answers',
  'landing.preview.stats.mathematics': 'Mathematics',
  'landing.preview.stats.history': 'History of Ukraine',
  'landing.preview.stats.mathematicsAccuracy': 'Mathematics accuracy',
  'landing.preview.stats.historyAccuracy': 'History of Ukraine accuracy',

  // ---- Landing: CTA + footer ---------------------------------------------
  'landing.cta.title': 'Start learning in the next minute',
  'landing.cta.description': 'Create a free account and take your first quiz today.',
  'landing.cta.button': 'Create Account',
  'landing.footer.tagline': 'Learn Progress Repeat',
  'landing.footer.login': 'Login',
  'landing.footer.register': 'Register',
  'landing.footer.rights': '© {year} L&S. All rights reserved.',

  // ---- Auth: shared -------------------------------------------------------
  'auth.field.email': 'Email',
  'auth.field.emailPlaceholder': 'you@example.com',
  'auth.field.password': 'Password',
  'auth.field.username': 'Username',
  'auth.field.usernamePlaceholder': 'your_username',
  'auth.field.usernameHint': '3–30 characters: letters, numbers, and underscores.',
  'auth.field.passwordHint': 'At least 8 characters with upper, lower, a number, and a symbol.',
  'auth.field.confirmPassword': 'Confirm password',
  'auth.field.preferredLanguage': 'Preferred language',
  'auth.language.english': 'English',
  'auth.language.ukrainian': 'Ukrainian',

  // ---- Auth: login --------------------------------------------------------
  'auth.login.title': 'Sign in',
  'auth.login.subtitle': 'Welcome back to L&S',
  'auth.login.submit': 'Sign in',
  'auth.login.forgot': 'Forgot password?',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.createOne': 'Create one',
  'auth.login.notVerified': "Haven't verified your email?",
  'auth.login.resend': 'Resend verification',
  'auth.login.welcomeToast': 'Welcome back!',

  // ---- Auth: register -----------------------------------------------------
  'auth.register.title': 'Create your account',
  'auth.register.subtitle': 'Start learning with L&S',
  'auth.register.submit': 'Create account',
  'auth.register.hasAccount': 'Already have an account?',
  'auth.register.signIn': 'Sign in',
  'auth.register.checkEmail.title': 'Check your email',
  'auth.register.checkEmail.subtitle': "We've sent a verification link to {email}.",
  'auth.register.checkEmail.alert':
    'Your account has been created. Click the link in the email to verify your address, then sign in.',
  'auth.register.checkEmail.resend': 'Resend verification email',
  'auth.register.checkEmail.ready': 'Ready to sign in?',
  'auth.register.checkEmail.goToLogin': 'Go to sign in',
  'auth.register.resendSuccess': 'If the address still needs verifying, a new link is on its way.',
  'auth.register.resendError': 'Could not resend right now. Please try again.',

  // ---- Auth: forgot / reset password --------------------------------------
  'auth.forgot.title': 'Forgot your password?',
  'auth.forgot.subtitle': "We'll email you a link to reset it.",
  'auth.forgot.submit': 'Send reset link',
  'auth.forgot.remembered': 'Remembered it?',
  'auth.forgot.backToLogin': 'Back to sign in',
  'auth.forgot.sent.title': 'Check your email',
  'auth.forgot.sent.alert':
    "If an account exists for {email}, we've sent a link to reset your password. The link expires after a while, so use it soon.",
  'auth.reset.title': 'Set a new password',
  'auth.reset.subtitle': "Choose a strong password you don't use elsewhere.",
  'auth.reset.newPassword': 'New password',
  'auth.reset.confirmPassword': 'Confirm new password',
  'auth.reset.submit': 'Update password',
  'auth.reset.invalid.title': 'Invalid reset link',
  'auth.reset.invalid.alert':
    'This password reset link is missing its token or is malformed. Please request a new one.',
  'auth.reset.invalid.request': 'Request a new reset link',
  'auth.reset.done.title': 'Password updated',
  'auth.reset.done.alert':
    'Your password has been changed and all existing sessions were signed out. Sign in with your new password.',

  // ---- Auth: email verification -------------------------------------------
  'auth.verify.pending.title': 'Verifying your email',
  'auth.verify.pending.subtitle': 'This will only take a moment.',
  'auth.verify.success.title': 'Email verified',
  'auth.verify.success.alert': 'Your email address has been verified. You can now sign in to your account.',
  'auth.verify.success.continue': 'Continue to sign in',
  'auth.verify.failed.title': 'Verification failed',
  'auth.verify.failed.hint': 'Request a fresh verification link:',
  'auth.verify.failed.submit': 'Send new link',
  'auth.verify.alreadyVerified': 'Already verified?',
  'auth.verify.signIn': 'Sign in',
  'auth.resend.title': 'Verify your email',
  'auth.resend.subtitle': 'Enter your email to receive a new verification link.',
  'auth.resend.submit': 'Resend verification email',
  'auth.resend.sent':
    'If {email} is registered and still needs verifying, a new verification link is on its way.',
};
