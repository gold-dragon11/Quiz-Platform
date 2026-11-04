import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { toast } from '@/stores/toast-store';
import { useAdminNmtCalendar, useNmtCalendarMutations } from '@/features/nmt-calendar/hooks/use-nmt-calendar';

/**
 * «14 травня 2027» from «2027-05-14», without a time zone getting involved,
 * and without the «р.» Intl appends: the sentence supplies its own full stop.
 */
function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(/\s?р\.$/, '');
}

/**
 * The admin's «Календар НМТ» tab (decision 49): the first day of the main
 * session and the document it comes from.
 *
 * The date is the one thing in the product that must not be guessed, so the
 * source is a required field rather than a note, and the screen says plainly
 * that nothing is shown anywhere until both are filled in.
 */
export function NmtCalendarSection(): React.JSX.Element {
  const calendar = useAdminNmtCalendar();
  const { save, clear } = useNmtCalendarMutations();
  const [date, setDate] = useState('');
  const [source, setSource] = useState('');
  const [confirming, setConfirming] = useState(false);

  // The form starts from what is saved, and follows it after a save or clear.
  useEffect(() => {
    setDate(calendar.data?.mainSessionStart ?? '');
    setSource(calendar.data?.sourceUrl ?? '');
  }, [calendar.data]);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    save.mutate(
      { mainSessionStart: date, sourceUrl: source.trim() },
      {
        onSuccess: () => toast.success('Дату збережено. Відлік уже видно на головній і на лендингу.'),
        onError: (error) => toast.error(isApiError(error) ? error.message : 'Не вдалося зберегти.'),
      },
    );
  };

  if (calendar.isPending) {
    return <Skeleton className="h-48" />;
  }

  const saved = calendar.data;

  return (
    <section className="max-w-xl">
      <h2 className="section-title border-border border-b pb-3">Основна сесія НМТ</h2>
      <p className="text-text-secondary mt-6 text-sm">
        {saved ? (
          <>
            Зараз внесено: <span className="text-text-primary">{longDate(saved.mainSessionStart)}</span>. Учні
            й гості бачать відлік до 00:00 за Києвом цього дня, а з початку сесії він зникає сам.
          </>
        ) : (
          <>
            Дату не внесено, тож відліку ніде немає. Внесіть перший день основної сесії з офіційного документа
            МОН чи УЦОЯО й посилання на нього.
          </>
        )}
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Input
          label="Перший день основної сесії"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          label="Посилання на джерело"
          type="url"
          required
          placeholder="https://"
          helperText="Наказ МОН або сторінка УЦОЯО з графіком. Без нього дату не зберегти."
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Button type="submit" isLoading={save.isPending} disabled={!date || !source.trim()}>
            Зберегти дату
          </Button>
          {saved && (
            <Button variant="ghost" onClick={() => setConfirming(true)} disabled={clear.isPending}>
              Прибрати дату
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="Прибрати дату?"
        description="Відлік зникне з головної, статистики й лендингу, доки ви не внесете дату знову."
        confirmLabel="Прибрати"
        cancelLabel="Скасувати"
        confirmVariant="danger"
        isLoading={clear.isPending}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              toast.success('Дату прибрано.');
            },
            onError: (error) => {
              setConfirming(false);
              toast.error(isApiError(error) ? error.message : 'Не вдалося прибрати дату.');
            },
          })
        }
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
