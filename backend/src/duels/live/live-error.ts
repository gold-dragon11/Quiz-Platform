/**
 * A refusal the player is meant to read: a code for the client to act on and
 * a sentence to show. Answered over the socket as an acknowledgement, never
 * thrown out of a handler.
 */
export type LiveErrorCode =
  | 'INVALID'
  | 'NOT_FOUND'
  | 'SELF'
  | 'OFFLINE'
  | 'BUSY'
  | 'OPPONENT_BUSY'
  | 'ACTIVE_SESSION'
  | 'NOT_ENOUGH_QUESTIONS'
  | 'DEMO'
  | 'NOT_LEARNER'
  | 'GONE';

const MESSAGES: Record<LiveErrorCode, string> = {
  INVALID: 'Такі налаштування гри недоступні.',
  // Also the answer for a demo account on either side: it reveals nothing
  // about whether the username exists.
  NOT_FOUND: 'Такого користувача не знайдено.',
  SELF: 'Не можна викликати самого себе.',
  OFFLINE: 'Цього користувача зараз немає на сайті.',
  BUSY: 'Спершу завершіть пошук, виклик або гру, що вже триває.',
  OPPONENT_BUSY: 'Цей користувач зараз в іншій грі.',
  ACTIVE_SESSION:
    'У вас є незавершений тест. Завершіть його, щоб грати наживо.',
  NOT_ENOUGH_QUESTIONS:
    'Для такого часу в цьому предметі бракує питань. Візьміть більше часу або менше питань.',
  DEMO: 'У демо-акаунті живих дуелей немає.',
  NOT_LEARNER: 'Живі дуелі — для тих, хто готується до НМТ.',
  GONE: 'Цей виклик уже неактуальний.',
};

export class LiveError extends Error {
  constructor(readonly code: LiveErrorCode) {
    super(MESSAGES[code]);
  }
}

export interface LiveFailure {
  ok: false;
  code: LiveErrorCode;
  message: string;
}

export function failure(error: LiveError): LiveFailure {
  return { ok: false, code: error.code, message: error.message };
}
