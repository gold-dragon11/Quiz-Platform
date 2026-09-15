import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import {
  FEATURES_ID,
  REVEAL_VIEWPORT,
  SECTION_CONTAINER,
  SECTION_SPACING,
} from '@/features/landing/constants';

interface Feature {
  title: string;
  body: string;
  link?: { to: string; label: string };
}

/**
 * Each entry names a mechanism and how it behaves, in numbers where there are
 * numbers. Every one of them is checked against the code: the 1, 3 and 7 days
 * are `REVIEW_LADDER_DAYS`, the two blocks are the two NMT blocks, the scale is
 * the official conversion table the result screen cites.
 */
const FEATURES: Feature[] = [
  {
    title: 'Пробний НМТ',
    body: 'Зошит одного предмета або цілий блок — українська з математикою, історія з англійською. Один годинник на всю роботу, завдання пронумеровані як на іспиті, а бал рахується за офіційною таблицею переведення 100–⁠200.',
  },
  {
    title: 'Помилки повертаються',
    body: 'Питання, у якому ви помилилися, приходить знову через день, потім через три і через сім. Правильна відповідь пересуває його на сходинку далі, нова помилка — на початок.',
  },
  {
    title: 'Для репетиторів',
    body: 'Група за кодом запрошення, домашка з теми, за помилками групи або пробний НМТ з одним варіантом на всіх. Потім — хто здав, хто запізнився і на яких питаннях посипалися.',
    link: { to: `${ROUTES.register}?as=teacher`, label: 'Створити акаунт вчителя' },
  },
  {
    title: 'Дуелі',
    body: 'Той самий набір питань для двох. Виграє точніший, за рівної точності — швидший. Грати можна коли завгодно: суперникові не треба бути онлайн.',
  },
];

/**
 * What the product does that a quiz site does not.
 *
 * The page used to stop at «проходь тести», which is every quiz site's
 * promise, and never mentioned the mock exam, the review schedule, the tutor
 * side or duels — the four things this project is actually built around.
 *
 * Laid out like the catalogue below it: a ruled list, the name in the display
 * serif and the mechanism beside it. Four equal tiles with an icon each would
 * have said the same words and looked like every generated landing page.
 */
export function FeaturesSection(): React.JSX.Element {
  return (
    <section id={FEATURES_ID} className="border-border relative scroll-mt-20 overflow-hidden border-t">
      <DecorCurves set="a" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading title="Що тут є, крім тестів" />

        <motion.dl
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="border-border mx-auto max-w-5xl border-t"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className="border-border grid gap-3 border-b py-8 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10"
            >
              <dt className="text-text-primary font-display text-2xl font-bold sm:text-3xl">
                {feature.title}
              </dt>
              <dd className="text-text-secondary text-base leading-relaxed">
                {feature.body}
                {feature.link && (
                  <>
                    {' '}
                    <Link to={feature.link.to} className="text-primary underline underline-offset-4">
                      {feature.link.label}
                    </Link>
                  </>
                )}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
