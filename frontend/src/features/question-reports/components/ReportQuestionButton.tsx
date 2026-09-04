import { useState } from 'react';
import { QuestionReportReason } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useReportQuestion } from '@/features/question-reports/hooks/use-question-report';
import { REPORT_REASON_LABEL } from '@/features/question-reports/types/question-report.types';

interface ReportQuestionButtonProps {
  questionId: string;
  className?: string;
}

const COMMENT_LIMIT = 1000;

/**
 * "Щось не так із запитанням?" — the one way a learner has of telling anybody
 * that a key is wrong.
 *
 * Deliberately quiet: a small text button, never a coloured one. A prominent
 * complaint button next to every question invites complaints about questions
 * that are merely hard, and a queue of those buries the reports that matter.
 *
 * The reason is a fixed list because the backend triages on it. The comment is
 * optional for every reason, including "Інше": demanding an explanation from
 * somebody who has just spotted a broken formula is how you stop being told
 * about broken formulas.
 */
export function ReportQuestionButton({
  questionId,
  className = '',
}: ReportQuestionButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<QuestionReportReason>(QuestionReportReason.WRONG_ANSWER);
  const [comment, setComment] = useState('');
  const report = useReportQuestion(questionId);

  // Survives the modal closing: the acknowledgement belongs to the question,
  // not to the dialog, so reopening it is not offered once a report is in.
  const [sent, setSent] = useState(false);

  const errorMessage =
    isApiError(report.error) && report.error.status !== 409
      ? report.error.message
      : report.error && !isApiError(report.error)
        ? 'Не вдалося надіслати. Спробуйте ще раз.'
        : null;

  function close(): void {
    if (report.isPending) {
      return;
    }
    setOpen(false);
    report.reset();
  }

  function submit(): void {
    report.mutate(
      { reason, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setSent(true);
          setOpen(false);
          setComment('');
        },
        // A 409 here means this person already has an open report on this
        // question. From where they stand that is not a failure — the thing
        // they wanted done is done — so it ends the same way a success does
        // rather than in a red box telling them off.
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            setSent(true);
            setOpen(false);
            setComment('');
          }
        },
      },
    );
  }

  if (sent) {
    return <p className={`text-text-muted text-xs ${className}`}>Дякуємо — ми перевіримо це запитання.</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-text-muted hover:text-text-secondary text-xs underline underline-offset-4 transition-colors ${className}`}
      >
        Щось не так із запитанням?
      </button>

      <Modal
        open={open}
        title="Повідомити про проблему"
        onClose={close}
        busy={report.isPending}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close} disabled={report.isPending}>
              Скасувати
            </Button>
            <Button onClick={submit} isLoading={report.isPending}>
              Надіслати
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-text-secondary mb-2 text-sm font-medium">Що саме не так?</legend>
            {Object.values(QuestionReportReason).map((value) => (
              <label key={value} className="text-text-primary flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="accent-primary h-4 w-4"
                />
                {REPORT_REASON_LABEL[value]}
              </label>
            ))}
          </fieldset>

          <Textarea
            label="Коментар (необовʼязково)"
            rows={4}
            maxLength={COMMENT_LIMIT}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            helperText={`${comment.length} / ${COMMENT_LIMIT}`}
            placeholder="Напишіть, що саме викликало сумнів — це пришвидшить перевірку."
          />
        </div>
      </Modal>
    </>
  );
}
