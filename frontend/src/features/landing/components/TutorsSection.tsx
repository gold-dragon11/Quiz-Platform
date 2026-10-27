import { Link } from 'react-router-dom';
import { demoLoginPath } from '@/shared/constants/demo';
import { ROUTES } from '@/shared/constants/routes';
import { buttonClassName } from '@/shared/ui/button-class';
import { SECTION_CONTAINER } from '@/features/landing/constants';

type Status = 'done' | 'late' | 'none';

/** A sample report, named as one in its caption: these are not real pupils. */
const ROWS: { name: string; status: Status; score: string | null }[] = [
  { name: 'Олена К.', status: 'done', score: '18 з 20' },
  { name: 'Ірина Б.', status: 'done', score: '16 з 20' },
  { name: 'Максим Т.', status: 'late', score: '14 з 20' },
  { name: 'Андрій П.', status: 'none', score: null },
];

const STATUS: Record<Status, { label: string; tone: string }> = {
  done: { label: 'здано', tone: 'text-text-secondary' },
  late: { label: 'здано із запізненням', tone: 'text-warning' },
  none: { label: 'не розпочато', tone: 'text-text-muted' },
};

/**
 * The tutor's side: the homework report a tutor reads after a deadline, as a
 * table, and the mistake the group shared most. A state is said in words and
 * its colour; the coloured dot that used to lead each one said nothing more.
 */
export function TutorsSection(): React.JSX.Element {
  return (
    <section aria-labelledby="tutors-title" className="bg-surface-elevated py-[clamp(96px,10vw,144px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(40px,6vw,96px)] min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}
      >
        <div className="min-w-0">
          <h2 id="tutors-title" className="lp-h2">
            Видно, хто здав і де група посипалася.
          </h2>
          <p className="text-text-secondary mt-6 max-w-[38ch] text-lg leading-relaxed">
            Група за кодом запрошення, домашка з теми, за помилками групи або пробний НМТ з одним варіантом на
            всіх.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              to={`${ROUTES.register}?as=teacher`}
              className={buttonClassName({ variant: 'secondary', size: 'lg' })}
            >
              Створити акаунт вчителя
            </Link>
            <Link to={demoLoginPath('teacher')} className="lp-link">
              Демо вчителя
            </Link>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-[15px] sm:text-base">
            <caption className="label pb-4 text-left">
              Приклад звіту: 11-Б, домашка «Козацька доба», до 14 жовтня
            </caption>
            <thead>
              <tr className="label text-left">
                <th scope="col" className="border-rule-ink border-b-2 pb-3 font-medium">
                  Учень
                </th>
                <th scope="col" className="border-rule-ink border-b-2 pb-3 font-medium">
                  Стан
                </th>
                <th scope="col" className="border-rule-ink border-b-2 pb-3 text-right font-medium">
                  Бали
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-border border-b">
                  <td className="text-text-primary py-4">{row.name}</td>
                  <td className={`py-4 ${STATUS[row.status].tone}`}>{STATUS[row.status].label}</td>
                  <td className="text-text-primary py-4 text-right tabular-nums">
                    {row.score ?? <span className="text-text-muted">немає</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-text-secondary mt-6 text-base">
            Найчастіша помилка групи:{' '}
            <b className="text-text-primary font-medium">№ 14, рік Люблінської унії</b>. Неправильно в 7 з 12.
          </p>
        </div>
      </div>
    </section>
  );
}
