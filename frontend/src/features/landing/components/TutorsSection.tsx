import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { SECTION_CONTAINER } from '@/features/landing/constants';

type Status = 'done' | 'late' | 'none';

/** An illustration of the assignment report, not real data. */
const ROWS: { name: string; status: Status; score: string }[] = [
  { name: 'Олена К.', status: 'done', score: '18 / 20' },
  { name: 'Ірина Б.', status: 'done', score: '16 / 20' },
  { name: 'Максим Т.', status: 'late', score: '14 / 20' },
  { name: 'Андрій П.', status: 'none', score: '—' },
];

const STATUS: Record<Status, { label: string; dot: string }> = {
  done: { label: 'здано', dot: 'bg-success' },
  late: { label: 'здано із запізненням', dot: 'bg-warning' },
  none: { label: 'не розпочато', dot: 'bg-text-muted' },
};

/**
 * The tutor side, shown as what a tutor gets back from a homework: who handed
 * it in, who was late, the scores, and the one question the group got wrong
 * most — the report the teacher's screen draws, set as a ruled table.
 */
export function TutorsSection(): React.JSX.Element {
  return (
    <section aria-labelledby="tutors-title" className="border-border border-t py-[clamp(72px,9vw,120px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(24px,4vw,64px)] min-[900px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}
      >
        <div className="min-w-0">
          <p className="lp-label">Для репетиторів</p>
          <h2 id="tutors-title" className="lp-h2">
            Видно, хто здав і де група посипалася.
          </h2>
          <p className="text-text-secondary mt-6 max-w-[34em] text-[clamp(17px,1.4vw,20px)] leading-relaxed">
            Група за кодом запрошення, домашка з теми, за помилками групи або пробний НМТ з одним варіантом на
            всіх. Потім видно, хто здав, хто запізнився і на яких питаннях посипалися.
          </p>
          <Link
            to={`${ROUTES.register}?as=teacher`}
            className="border-primary-hover hover:text-primary-hover mt-8 inline-block border-b pb-1.5 font-medium transition-colors"
          >
            Створити акаунт вчителя
          </Link>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-sm sm:text-[15px]">
            <caption className="lp-label pb-3.5 text-left">
              11-Б · домашка «Козацька доба» · до 14 жовтня
            </caption>
            <thead>
              <tr className="text-text-muted text-[11px] font-medium tracking-[0.14em] uppercase">
                <th scope="col" className="border-border border-b pb-3 text-left font-medium">
                  Учень
                </th>
                <th scope="col" className="border-border border-b pb-3 text-left font-medium">
                  Стан
                </th>
                <th scope="col" className="border-border border-b pb-3 text-right font-medium">
                  Бали
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-border text-text-secondary border-b">
                  <td className="text-text-primary py-4">{row.name}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                      <span
                        className={`size-[7px] rounded-full ${STATUS[row.status].dot}`}
                        aria-hidden="true"
                      />
                      {STATUS[row.status].label}
                    </span>
                  </td>
                  <td className="py-4 text-right tabular-nums">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-error bg-error/[0.07] text-text-secondary mt-5 border-l-2 px-4 py-4 text-[15px]">
            Найчастіша помилка групи: <b className="text-text-primary">№ 14, рік Люблінської унії</b>.
            Неправильно в 7 з 12.
          </p>
        </div>
      </div>
    </section>
  );
}
