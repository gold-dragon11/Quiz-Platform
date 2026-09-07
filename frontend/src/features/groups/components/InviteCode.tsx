import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

interface InviteCodeProps {
  code: string;
  onRegenerate: () => void;
  regenerating: boolean;
  /** An archived group keeps its code on screen but accepts nobody. */
  disabled?: boolean;
}

/**
 * The invite code, set at the size of the thing a teacher actually reads out
 * loud to a room.
 *
 * Wide letterspacing and lining figures because this is a string people
 * transcribe — read aloud in a lesson, or copied off a screen from the back of
 * the room. The characters that get confused are not this component's problem:
 * the generator's alphabet already excludes I, L, O, 0 and 1, so the type only
 * has to be large and evenly spaced, not disambiguating.
 *
 * Replacing the code is behind a confirmation, and the confirmation says the
 * one thing that matters — the old code stops working immediately. It is the
 * only lever a teacher has when a code leaks into the wrong chat, and also the
 * fastest way to lock out the half of the class that has not joined yet.
 */
export function InviteCode({
  code,
  onRegenerate,
  regenerating,
  disabled = false,
}: InviteCodeProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (an insecure origin, a locked-down
      // browser). The code is on screen either way, so there is nothing to
      // apologise for — the button simply does not confirm.
    }
  }

  return (
    <div className="border-border border-y py-8">
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Код запрошення</p>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-text-primary font-display text-4xl font-bold tracking-[0.2em] lining-nums sm:text-5xl">
          {code}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            {copied ? 'Скопійовано' : 'Скопіювати'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={disabled}
            isLoading={regenerating}
          >
            Новий код
          </Button>
        </div>
      </div>
      <p className="text-text-secondary mt-5 max-w-2xl text-sm">
        Поділіться кодом з учнями — за ним вони приєднаються до групи.
      </p>

      <ConfirmDialog
        open={confirming}
        title="Замінити код запрошення?"
        description="Старий код перестане працювати негайно. Усі, хто ще не встиг приєднатися, потребуватимуть нового."
        confirmLabel="Замінити"
        onConfirm={() => {
          setConfirming(false);
          onRegenerate();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
