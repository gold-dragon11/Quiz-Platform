/** What a digest counts, over whichever window it covers. */
export interface DigestCounts {
  /** Accounts created in the window, demo excluded, split by what they chose. */
  newLearners: number;
  newTeachers: number;
  /** How many of those new accounts have confirmed their address by now. */
  verified: number;
  /** Tests, mock papers and reviews finished in the window. */
  testsCompleted: number;
  /** Distinct people behind those tests. */
  activePeople: number;
  /** Every real account the platform has, for a sense of scale. */
  totalAccounts: number;
}

export type DigestPeriod = 'day' | 'week';

/**
 * Turns the counts into the message, or decides there is nothing to say.
 *
 * Kept a pure function, apart from the service that gathers the numbers,
 * because the judgement in here — what counts as a quiet day, how a lost
 * verification letter is made visible — is the part worth testing, and it
 * needs no database to test.
 */
export function buildDigest(
  period: DigestPeriod,
  counts: DigestCounts,
): string | null {
  const newAccounts = counts.newLearners + counts.newTeachers;
  const quiet = newAccounts === 0 && counts.testsCompleted === 0;

  // A daily message saying nothing happened, every morning, trains you to
  // stop reading the ones that say something. The weekly summary goes out
  // regardless, so silence stays distinguishable from a broken bot.
  if (period === 'day' && quiet) {
    return null;
  }

  const lines: string[] = [
    period === 'day' ? 'За добу' : 'За тиждень',
    '',
    `Нових акаунтів: ${newAccounts}${describeSplit(counts)}`,
  ];

  // Only once somebody has registered: «0 of 0 confirmed» is noise, and on a
  // quiet week it would be the only thing the summary said.
  if (newAccounts > 0) {
    lines.push(`Підтвердили пошту: ${counts.verified} з ${newAccounts}`);

    const pending = newAccounts - counts.verified;
    if (pending > 0) {
      // The sharpest drop in the funnel, and invisible from anywhere else —
      // a letter in a spam folder looks exactly like a person losing interest.
      lines.push(
        `  ${pending} ${plural(pending, 'не дійшов', 'не дійшли', 'не дійшли')} до підтвердження`,
      );
    }
  }

  lines.push(
    `Пройдено тестів: ${counts.testsCompleted}`,
    `Людей за тестами: ${counts.activePeople}`,
    '',
    `Всього акаунтів: ${counts.totalAccounts}`,
  );

  return lines.join('\n');
}

function describeSplit(counts: DigestCounts): string {
  // The split only earns its parentheses when both kinds actually appeared.
  if (counts.newLearners > 0 && counts.newTeachers > 0) {
    return ` (учнів ${counts.newLearners}, вчителів ${counts.newTeachers})`;
  }
  if (counts.newTeachers > 0) {
    return ' (вчителі)';
  }
  return '';
}

/** Ukrainian needs three forms, and «1 не дійшли» reads as a bug. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }
  const mod10 = n % 10;
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}
