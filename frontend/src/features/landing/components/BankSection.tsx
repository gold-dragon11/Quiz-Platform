import { useCatalogue } from '@/features/landing/hooks/use-catalogue';
import { SECTION_CONTAINER } from '@/features/landing/constants';
import { formatNumber, pluralUk } from '@/shared/utils/format';

/**
 * The bank, from `/catalogue`: the live count of published questions and the
 * four subjects as ruled rows, where a pricing table would stand on a page
 * that sold something. The product is free, so the rows say what is in it.
 *
 * Nothing is printed until the numbers arrive, and if the catalogue cannot be
 * read the section is left out: a figure on this page is either the real one
 * or absent, never a placeholder that could be mistaken for it.
 */
export function BankSection(): React.JSX.Element | null {
  const catalogue = useCatalogue();

  if (!catalogue.data) {
    return null;
  }
  const { subjects, totalQuestions, totalTopics } = catalogue.data;

  return (
    <section aria-labelledby="bank-title" className="py-[clamp(120px,12vw,176px)]">
      <div className={SECTION_CONTAINER}>
        <div className="grid gap-8 min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[60rem]:items-end">
          <h2 id="bank-title" className="lp-h2">
            {formatNumber(totalQuestions)} {pluralUk(totalQuestions, 'питання', 'питання', 'питань')} у банку.
          </h2>
          <p className="text-text-secondary max-w-[44ch] text-lg leading-relaxed">
            {subjects.length} {pluralUk(subjects.length, 'предмет', 'предмети', 'предметів')} і {totalTopics}{' '}
            {pluralUk(totalTopics, 'тема', 'теми', 'тем')}; до кожної теми є конспект, до кожного питання
            пояснення.
          </p>
        </div>

        <table className="mt-[clamp(48px,6vw,80px)] w-full border-collapse">
          <caption className="sr-only">Предмети в банку питань</caption>
          <thead>
            <tr className="label text-left">
              <th scope="col" className="border-rule-ink border-b-2 pb-3 font-medium">
                Предмет
              </th>
              <th scope="col" className="border-rule-ink border-b-2 pb-3 text-right font-medium">
                Теми
              </th>
              <th scope="col" className="border-rule-ink border-b-2 pb-3 text-right font-medium">
                Питання
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.slug} className="border-border border-b">
                <th
                  scope="row"
                  className="font-display text-text-primary py-5 text-left text-[clamp(22px,2vw,30px)] font-normal"
                >
                  {subject.name}
                </th>
                <td className="figure text-text-secondary py-5 text-right">{subject.topics.length}</td>
                <td className="figure text-text-primary py-5 text-right">
                  {formatNumber(subject.questionCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
