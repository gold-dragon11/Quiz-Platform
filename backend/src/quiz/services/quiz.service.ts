import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Difficulty,
  ExplanationVisibility,
  Language,
  Prisma,
  QuestionFormat,
  QuestionType,
  QuizStatus,
  QuizType,
  XPSource,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuizConfigService } from '../../quizzes/services/quiz-config.service';
import { SettingsService } from '../../settings/services/settings.service';
import { StatisticsService } from '../../statistics/services/statistics.service';
import { XpAward } from '../../statistics/repositories/statistics.repository';
import { StartMistakeReviewDto } from '../dto/start-mistake-review.dto';
import { MockExamSpecQueryDto } from '../dto/mock-exam-spec-query.dto';
import { StartMockExamDto } from '../dto/start-mock-exam.dto';
import { StartQuizDto } from '../dto/start-quiz.dto';
import { mockExamSpecFor, questionsPerDifficulty } from '../mock-exam.config';
import type { NmtBlock, NmtPaper } from '../nmt/nmt-paper.types';
import { NmtPaperRegistry } from '../nmt/nmt-papers';
import {
  maxTestPoints,
  scorePaper,
  type NmtPaperScore,
} from '../nmt/nmt-scoring';
import { paperTaskCount, taskLabel } from '../nmt/task-numbering';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { correctAnswerFor, evaluateAnswer } from '../quiz-answer.util';
import { shuffleMatchingOrder } from '../matching-shuffle.util';
import {
  MistakeReviewRepository,
  MistakeReviewSummary,
} from '../repositories/mistake-review.repository';
import { QuestionAttemptRepository } from '../repositories/question-attempt.repository';
import {
  QuizSessionRecord,
  QuizSessionRepository,
  SessionQuestionRecord,
} from '../repositories/quiz-session.repository';
import { ResultRepository } from '../repositories/result.repository';
import {
  MockExamAttempt,
  MockExamBlockView,
  MockExamSpecView,
  NmtSittingView,
  QuizQuestionView,
  QuizResultSummary,
  QuizResumeView,
  QuizReview,
  QuizReviewQuestion,
  QuizSessionMetadata,
} from '../types/quiz.types';

/** Timer budget per question (decision D5). */
const SECONDS_PER_QUESTION = 60;
/** Extra XP for a high-accuracy quiz, and its threshold (decisions D13/R2). */
const HIGH_ACCURACY_THRESHOLD = 90;
const HIGH_ACCURACY_BONUS_XP = 25;

const SESSION_NOT_FOUND_MESSAGE = 'Сесію тесту не знайдено.';
const SUBJECT_NOT_FOUND_MESSAGE =
  'Предмет не знайдено або він не опублікований.';
const NOTHING_DUE_MESSAGE =
  'На сьогодні повторювати нічого. Помилки повернуться за розкладом.';
/** A review is a short sitting by design — it is a habit, not a marathon. */
const DEFAULT_REVIEW_SIZE = 10;
/** A mock exam set as homework needs the group subject to have a paper. */
const NO_PAPER_MESSAGE =
  'Для цього предмета ще немає зошита НМТ — пробний як домашку видати не можна.';
const MOCK_EXAM_TOO_SHORT_MESSAGE =
  'У цьому предметі поки замало опублікованих питань для пробного тесту.';
const MOCK_BLOCK_TOO_SHORT_MESSAGE =
  'Для цього блоку НМТ поки бракує опублікованих завдань.';
const MOCK_TARGET_MESSAGE = 'Оберіть предмет або блок НМТ — щось одне.';
const BLOCK_NOT_FOUND_MESSAGE = 'Такого блоку НМТ немає.';
const ACTIVE_SESSION_EXISTS_MESSAGE =
  'Активна сесія тесту вже існує. Завершіть її, перш ніж починати нову.';
const ACTIVE_ASSIGNMENT_SESSION_MESSAGE =
  'У вас уже є незавершене завдання з цього предмета. Завершіть його спочатку.';
const INSUFFICIENT_QUESTIONS_MESSAGE =
  'Для цього тесту бракує опублікованих питань.';
// Says which pool came up short: the advanced tier holds far fewer questions
// than the others, so "not enough" here usually means "not at this level".
const INSUFFICIENT_AT_DIFFICULTY_MESSAGE =
  'Для цього рівня бракує опублікованих питань. Оберіть меншу кількість або інший рівень.';
// Distinct from the message above: the pool is empty because the reader has
// already fixed those mistakes, which is success, not a content gap.
const INSUFFICIENT_MISTAKES_MESSAGE =
  'Помилок для повторення вже немає — ви виправили їх усі.';
// The NMT bank is being written topic by topic, so a reader can reasonably
// ask for a format that has no content in this topic yet. Saying which pool
// is empty keeps that from reading as a bug.
const INSUFFICIENT_IN_FORMAT_MESSAGE =
  'Завдань формату НМТ у цій темі поки бракує. Оберіть меншу кількість або звичайне тренування.';
const SESSION_NOT_ACTIVE_MESSAGE = 'Ця сесія тесту неактивна.';
const SESSION_NOT_COMPLETED_MESSAGE = 'Ця сесія тесту ще не завершена.';
const QUESTION_NOT_IN_SESSION_MESSAGE = 'Це питання не належить до цієї сесії.';
const QUIZ_NOT_FOUND_MESSAGE = 'Тест не знайдено.';
const QUIZ_ID_XOR_MESSAGE =
  'Provide either quizId or the ad-hoc fields (subjectId, topicId, questionCount, timerEnabled), not both.';
const MISSING_START_FIELDS_MESSAGE =
  'subjectId, questionCount, and timerEnabled are required when quizId is not provided.';
const DIFFICULTY_WITH_MISTAKES_MESSAGE =
  'difficulty cannot be combined with onlyMistakes: the mistake pool is already a fixed set of questions.';
const FORMAT_WITH_MISTAKES_MESSAGE =
  'format cannot be combined with onlyMistakes: the mistake pool is already a fixed set of questions.';

/** The resolved generation config for a start request (Phase 5.6). */
interface StartConfig {
  quizId: string | null;
  subjectId: string;
  topicId: string | null;
  questionCount: number;
  timerEnabled: boolean;
  mode: QuizType;
  /** Ad-hoc only: draw from the reader's unresolved mistakes. */
  onlyMistakes: boolean;
  /** Ad-hoc only: restrict the pool to one level, or null for a mix. */
  difficulty: Difficulty | null;
  /** Ad-hoc only: restrict the pool to one format, or null for both. */
  format: QuestionFormat | null;
}

/** One NMT paper of a mock sitting, with the subject it is sat in. */
interface SittingPaper {
  paper: NmtPaper;
  subjectId: string;
  subjectName: string;
}

/** What a mock sitting follows: one subject's paper, or a block of papers. */
interface Sitting {
  title: string;
  minutes: number;
  papers: SittingPaper[];
  /** The block's slug; null for a sitting of one subject. */
  blockSlug: string | null;
}

/** Aggregate counts derived from a session's snapshot and attempts. */
interface Tally {
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalQuestions: number;
  exactAccuracy: number;
}

/**
 * Quiz engine (docs/04-api/quiz.md, docs/02-domain/quiz-session.md).
 *
 * Owns the full session lifecycle: ad-hoc generation with a fixed question
 * snapshot, per-answer upserts with immediate evaluation, atomic completion
 * (result + XP + statistics), lazy timer expiry, and post-completion review.
 * Correct answers are never exposed while a session is ACTIVE (decision D11).
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizSessionRepository: QuizSessionRepository,
    private readonly questionAttemptRepository: QuestionAttemptRepository,
    private readonly resultRepository: ResultRepository,
    private readonly settingsService: SettingsService,
    private readonly statisticsService: StatisticsService,
    private readonly quizConfigService: QuizConfigService,
    private readonly mistakeReviewRepository: MistakeReviewRepository,
    private readonly nmtPapers: NmtPaperRegistry,
  ) {}

  /**
   * Starts a new self-study quiz (docs/04-api/quiz.md §4). Resolves the
   * generation configuration from either a stored Quiz or the ad-hoc request
   * (Phase 5.6), then, in one transaction: enforces the concurrency rule,
   * selects the random published question set (decisions D21/D23), and creates
   * the ACTIVE session with its snapshot and timer deadline (decisions
   * D1/D3/D5).
   *
   * The rule this route enforces is now the self-study half of decision 13:
   * one active self-study session per user. Homework is counted separately,
   * per subject, so a student halfway through maths homework can still open a
   * practice quiz — under the old single-session rule they had to abandon one
   * to touch the other.
   */
  async start(userId: string, dto: StartQuizDto): Promise<QuizSessionMetadata> {
    const config = await this.resolveStartConfig(dto);

    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }

    // Mistake practice narrows the pool; everything downstream — the fixed
    // snapshot, scoring, XP, statistics — is identical either way.
    const questionIds = config.onlyMistakes
      ? await this.quizSessionRepository.selectMistakeQuestionIds({
          userId,
          subjectId: config.subjectId,
          topicId: config.topicId ?? undefined,
          count: config.questionCount,
        })
      : await this.quizSessionRepository.selectRandomQuestionIds({
          subjectId: config.subjectId,
          topicId: config.topicId ?? undefined,
          difficulty: config.difficulty ?? undefined,
          format: config.format ?? undefined,
          count: config.questionCount,
          // Practice prefers what this learner has not seen lately
          // (decision 15). Mistake practice above deliberately does not: its
          // whole purpose is to bring back the questions they got wrong, and
          // filtering by exposure would empty the pool it draws from.
          userId,
        });
    if (questionIds.length < config.questionCount) {
      throw new ConflictException(
        config.onlyMistakes
          ? INSUFFICIENT_MISTAKES_MESSAGE
          : config.difficulty
            ? INSUFFICIENT_AT_DIFFICULTY_MESSAGE
            : config.format
              ? INSUFFICIENT_IN_FORMAT_MESSAGE
              : INSUFFICIENT_QUESTIONS_MESSAGE,
      );
    }

    const expiresAt = config.timerEnabled
      ? new Date(
          Date.now() + SECONDS_PER_QUESTION * config.questionCount * 1000,
        )
      : null;

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: config.quizId,
          subjectId: config.subjectId,
          topicId: config.topicId,
          mode: config.mode,
          timerEnabled: config.timerEnabled,
          questionCount: config.questionCount,
          expiresAt,
          questionIds,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      // The partial unique index is the concurrency backstop for the
      // one-active-session rule (decision D4).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Starts a mock sitting of the national exam (decision 28).
   *
   * Three things separate it from ordinary practice, and all three are the
   * point: the paper is fixed by the specification rather than chosen, the
   * clock runs for the whole paper rather than per question, and the sitting
   * is recorded as its own type so a student can watch the curve across
   * months instead of hunting it out of general practice.
   *
   * It occupies the self-study slot: one mock at a time, and starting one
   * while an ordinary quiz is open is refused the same way as any other
   * second practice session.
   */
  async startMockExam(
    userId: string,
    dto: StartMockExamDto,
  ): Promise<QuizSessionMetadata> {
    if ((dto.subjectId === undefined) === (dto.block === undefined)) {
      throw new BadRequestException(MOCK_TARGET_MESSAGE);
    }
    if (dto.block !== undefined) {
      return this.startNmtBlock(userId, dto.block);
    }

    const subject = await this.quizSessionRepository.findSubjectForMock(
      dto.subjectId as string,
    );
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }

    const paper = this.nmtPapers.forSubjectSlug(subject.slug);
    if (paper) {
      return this.startSitting(userId, {
        title: paper.title,
        minutes: paper.minutes,
        papers: [{ paper, subjectId: subject.id, subjectName: subject.name }],
        blockSlug: null,
      });
    }

    const spec = mockExamSpecFor(subject.slug);
    const questionIds: string[] = [];

    for (const tier of questionsPerDifficulty(spec)) {
      questionIds.push(
        ...(await this.quizSessionRepository.selectRandomQuestionIds({
          subjectId: subject.id,
          difficulty: tier.difficulty,
          count: tier.count,
          userId,
        })),
      );
    }

    // A short paper is not a mock. Better to say the bank is not ready than to
    // hand someone a twelve-question "exam" and let them draw conclusions.
    if (questionIds.length < spec.questionCount) {
      throw new ConflictException(MOCK_EXAM_TOO_SHORT_MESSAGE);
    }

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          subjectId: subject.id,
          topicId: null,
          mode: QuizType.MOCK_EXAM,
          timerEnabled: true,
          questionCount: questionIds.length,
          expiresAt: new Date(Date.now() + spec.minutes * 60 * 1000),
          questionIds,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * A mock sitting of a joint NMT block (docs/02-domain/nmt-paper.md §8): every
   * paper of the block, one after another, on the block's single clock.
   */
  private async startNmtBlock(
    userId: string,
    slug: string,
  ): Promise<QuizSessionMetadata> {
    const block = this.nmtPapers.block(slug);
    if (!block) {
      throw new NotFoundException(BLOCK_NOT_FOUND_MESSAGE);
    }
    const subjects = await this.quizSessionRepository.findSubjectsBySlugs(
      block.subjectSlugs,
      { publishedOnly: true },
    );
    const papers = this.papersOf(block, subjects);
    if (papers.length !== block.subjectSlugs.length) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }
    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }
    return this.startSitting(userId, {
      title: block.title,
      minutes: block.minutes,
      papers,
      blockSlug: block.slug,
    });
  }

  /**
   * Opens a sitting (docs/02-domain/nmt-paper.md §5): one question for every
   * task number of every paper, in the papers' order, least recently seen
   * first — so a learner meets a different variant each time the pool allows
   * it. A number with nothing to fill it refuses the whole sitting and names
   * the gap: a paper with a task missing is not the paper.
   */
  private async startSitting(
    userId: string,
    sitting: Sitting,
  ): Promise<QuizSessionMetadata> {
    const questionIds: string[] = [];
    const gaps: { subjectName: string; numbers: number[] }[] = [];
    for (const { paper, subjectId, subjectName } of sitting.papers) {
      const drawn = await this.drawPaper(userId, subjectId, paper);
      questionIds.push(...drawn.questionIds);
      if (drawn.missing.length > 0) {
        gaps.push({ subjectName, numbers: drawn.missing });
      }
    }
    if (gaps.length > 0) {
      throw new ConflictException(
        sitting.blockSlug === null
          ? `${MOCK_EXAM_TOO_SHORT_MESSAGE} Бракує завдань №${gaps[0].numbers.join(', ')}.`
          : `${MOCK_BLOCK_TOO_SHORT_MESSAGE} ${gaps
              .map((gap) => `${gap.subjectName}: №${gap.numbers.join(', ')}`)
              .join('; ')}.`,
      );
    }

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          subjectId: sitting.papers[0].subjectId,
          topicId: null,
          mode: QuizType.MOCK_EXAM,
          timerEnabled: true,
          questionCount: questionIds.length,
          expiresAt: new Date(Date.now() + sitting.minutes * 60 * 1000),
          questionIds,
          nmtBlock: sitting.blockSlug,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
      }
      throw error;
    }
  }

  /** One paper's questions, task by task; `missing` names the empty numbers. */
  private async drawPaper(
    userId: string,
    subjectId: string,
    paper: NmtPaper,
  ): Promise<{ questionIds: string[]; missing: number[] }> {
    const questionIds: string[] = [];
    const missing: number[] = [];
    for (const task of paper.tasks) {
      const block = paper.passageBlocks.find(
        (run) => run.from <= task.number && task.number <= run.to,
      );
      if (block) {
        // The whole run is drawn at its first number; the rest are already in.
        if (task.number !== block.from) {
          continue;
        }
        const tasks = paper.tasks.filter(
          (member) => block.from <= member.number && member.number <= block.to,
        );
        const ids = await this.quizSessionRepository.selectPassageForTasks({
          subjectId,
          tasks,
          userId,
        });
        if (ids) {
          questionIds.push(...ids);
        } else {
          missing.push(...tasks.map((member) => member.number));
        }
        continue;
      }
      const questionId = await this.quizSessionRepository.selectQuestionForTask(
        { subjectId, task, userId },
      );
      if (questionId) {
        questionIds.push(questionId);
      } else {
        missing.push(task.number);
      }
    }
    return { questionIds, missing };
  }

  /** A block's papers paired with their subjects, in the block's order. */
  private papersOf(
    block: NmtBlock,
    subjects: { id: string; slug: string; name: string }[],
  ): SittingPaper[] {
    return block.subjectSlugs.flatMap((slug) => {
      const paper = this.nmtPapers.forSubjectSlug(slug);
      const subject = subjects.find((candidate) => candidate.slug === slug);
      return paper && subject
        ? [{ paper, subjectId: subject.id, subjectName: subject.name }]
        : [];
    });
  }

  /**
   * What a mock sitting follows — one subject's paper or every paper of a
   * block — or null for any other session and for a subject still on the
   * provisional sitting.
   */
  private async sittingFor(
    session: QuizSessionRecord,
  ): Promise<Sitting | null> {
    if (session.mode !== QuizType.MOCK_EXAM) {
      return null;
    }
    if (session.nmtBlock !== null) {
      const block = this.nmtPapers.block(session.nmtBlock);
      if (!block) {
        return null;
      }
      const subjects = await this.quizSessionRepository.findSubjectsBySlugs(
        block.subjectSlugs,
      );
      return {
        title: block.title,
        minutes: block.minutes,
        papers: this.papersOf(block, subjects),
        blockSlug: block.slug,
      };
    }
    const subject = await this.quizSessionRepository.findSubjectById(
      session.subjectId,
    );
    const paper = subject ? this.nmtPapers.forSubjectSlug(subject.slug) : null;
    if (!subject || !paper) {
      return null;
    }
    return {
      title: paper.title,
      minutes: paper.minutes,
      papers: [{ paper, subjectId: subject.id, subjectName: subject.name }],
      blockSlug: null,
    };
  }

  /**
   * Scores a mock sitting paper by paper, each by its own rules; null when the
   * sitting follows no paper. A block's questions are told apart by subject,
   * since every paper numbers its tasks from 1.
   */
  private async scoreSitting(
    session: QuizSessionRecord,
    attempts: { questionId: string; selectedAnswer: Prisma.JsonValue }[],
  ): Promise<{
    sitting: Sitting;
    scores: (SittingPaper & { score: NmtPaperScore })[];
  } | null> {
    const sitting = await this.sittingFor(session);
    if (!sitting) {
      return null;
    }
    const questions = await this.quizSessionRepository.findSessionQuestions(
      session.id,
    );
    const answers = new Map(
      attempts.map((attempt) => [attempt.questionId, attempt.selectedAnswer]),
    );
    return {
      sitting,
      scores: sitting.papers.map((entry) => ({
        ...entry,
        score: scorePaper(
          entry.paper,
          questions.filter(
            (question) => question.subjectSlug === entry.paper.subjectSlug,
          ),
          answers,
        ),
      })),
    };
  }

  /**
   * The shape of a sitting in this subject, for a client that wants to say
   * what the student is about to walk into before they start.
   *
   * Only the two numbers a learner acts on. The difficulty mix stays private:
   * it is a generation detail, and publishing it would invite gaming a paper
   * whose whole point is that it is not configurable.
   */
  async mockExamSpec(query: MockExamSpecQueryDto): Promise<MockExamSpecView> {
    if ((query.subjectId === undefined) === (query.block === undefined)) {
      throw new BadRequestException(MOCK_TARGET_MESSAGE);
    }
    if (query.block !== undefined) {
      const block = this.nmtPapers.block(query.block);
      if (!block) {
        throw new NotFoundException(BLOCK_NOT_FOUND_MESSAGE);
      }
      const subjects = await this.quizSessionRepository.findSubjectsBySlugs(
        block.subjectSlugs,
        { publishedOnly: true },
      );
      const papers = this.papersOf(block, subjects);
      if (papers.length !== block.subjectSlugs.length) {
        throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
      }
      return {
        questionCount: papers.reduce(
          (sum, { paper }) => sum + paper.tasks.length,
          0,
        ),
        minutes: block.minutes,
        paper: null,
        block: {
          title: block.title,
          timingNote: block.timingNote,
          papers: papers.map(({ paper, subjectName }) => ({
            subjectName,
            title: paper.title,
            questionCount: paper.tasks.length,
            taskCount: paperTaskCount(paper),
            maxTestPoints: maxTestPoints(paper),
          })),
        },
      };
    }

    const subject = await this.quizSessionRepository.findSubjectForMock(
      query.subjectId as string,
    );
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    const paper = this.nmtPapers.forSubjectSlug(subject.slug);
    if (paper) {
      return {
        questionCount: paper.tasks.length,
        minutes: paper.minutes,
        paper: {
          title: paper.title,
          taskCount: paperTaskCount(paper),
          maxTestPoints: maxTestPoints(paper),
          timingNote: paper.timingNote,
          sections: paper.sections,
        },
        block: null,
      };
    }

    const spec = mockExamSpecFor(subject.slug);
    return {
      questionCount: spec.questionCount,
      minutes: spec.minutes,
      paper: null,
      block: null,
    };
  }

  /**
   * A subject's paper in the few numbers a screen about it needs — what an
   * assignment of a mock exam shows its teacher and its students. Null for a
   * subject without one.
   */
  paperSummary(subjectSlug: string): {
    title: string;
    taskCount: number;
    maxTestPoints: number;
    minutes: number;
  } | null {
    const paper = this.nmtPapers.forSubjectSlug(subjectSlug);
    return paper
      ? {
          title: paper.title,
          taskCount: paperTaskCount(paper),
          maxTestPoints: maxTestPoints(paper),
          minutes: paper.minutes,
        }
      : null;
  }

  /**
   * One variant of a subject's paper for a mock exam set as homework
   * (decision 29), drawn the way a sitting is (docs/02-domain/nmt-paper.md
   * §5). It is drawn once, at issue, and frozen with the assignment, so every
   * student in the group sits the same variant and their scores compare.
   * `teacherId` only orders the draw; a teacher has seen almost nothing, so it
   * is close to random.
   */
  async drawPaperForAssignment(
    teacherId: string,
    subjectId: string,
  ): Promise<string[]> {
    const subject = await this.quizSessionRepository.findSubjectById(subjectId);
    const paper = subject ? this.nmtPapers.forSubjectSlug(subject.slug) : null;
    if (!paper) {
      throw new BadRequestException(NO_PAPER_MESSAGE);
    }
    const drawn = await this.drawPaper(teacherId, subjectId, paper);
    if (drawn.missing.length > 0) {
      throw new ConflictException(
        `${MOCK_EXAM_TOO_SHORT_MESSAGE} Бракує завдань №${drawn.missing.join(', ')}.`,
      );
    }
    return drawn.questionIds;
  }

  /**
   * The joint NMT blocks that can be sat now: those whose every subject is
   * published and has a paper. The client lists them beside the subjects.
   */
  async mockExamBlocks(): Promise<MockExamBlockView[]> {
    const blocks = this.nmtPapers.allBlocks();
    const subjects = await this.quizSessionRepository.findSubjectsBySlugs(
      [...new Set(blocks.flatMap((block) => block.subjectSlugs))],
      { publishedOnly: true },
    );
    return blocks.flatMap((block) => {
      const papers = this.papersOf(block, subjects);
      return papers.length === block.subjectSlugs.length
        ? [
            {
              slug: block.slug,
              title: block.title,
              subjectNames: papers.map(({ subjectName }) => subjectName),
            },
          ]
        : [];
    });
  }

  /**
   * Starts a session made of the mistakes due today (decision from
   * docs/00-overview/teacher-side-decisions.md §6).
   *
   * Different from the existing `onlyMistakes` practice, which offers every
   * unresolved mistake at once: this one respects the schedule, so a learner
   * who opens it daily meets each question at widening intervals instead of
   * grinding the same list. Both exist because they answer different
   * questions — "let me drill my weak spots" and "what should I do today".
   */
  async startMistakeReview(
    userId: string,
    dto: StartMistakeReviewDto,
  ): Promise<QuizSessionMetadata> {
    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }

    const questionIds = await this.mistakeReviewRepository.findDueQuestionIds(
      userId,
      dto.questionCount ?? DEFAULT_REVIEW_SIZE,
      dto.subjectId,
    );
    if (questionIds.length === 0) {
      throw new ConflictException(NOTHING_DUE_MESSAGE);
    }

    // Every due question belongs to some subject; a review may span several,
    // so the session is pinned to the subject of the first one only when the
    // caller narrowed it. Statistics treat it the same either way.
    const subjectId =
      dto.subjectId ?? (await this.subjectOfQuestion(questionIds[0]));

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          subjectId,
          topicId: null,
          mode: QuizType.SUBJECT_QUIZ,
          timerEnabled: false,
          questionCount: questionIds.length,
          expiresAt: null,
          questionIds,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
      }
      throw error;
    }
  }

  /** What the learner owes today, and how much they have already fixed. */
  async mistakeReviewSummary(userId: string): Promise<MistakeReviewSummary> {
    return this.mistakeReviewRepository.summarize(userId);
  }

  private async subjectOfQuestion(questionId: string): Promise<string> {
    const question = await this.prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      select: { topic: { select: { subjectId: true } } },
    });
    return question.topic.subjectId;
  }

  /**
   * Past mock sittings, oldest first — the shape a student and a parent both
   * ask for, which is whether the line is going up.
   */
  async mockExamHistory(
    userId: string,
    subjectId?: string,
  ): Promise<MockExamAttempt[]> {
    const sessions = await this.quizSessionRepository.findMockExamAttempts(
      userId,
      subjectId,
    );

    return sessions.flatMap((session): MockExamAttempt[] => {
      if (!session.result || !session.completedAt) {
        return [];
      }
      const block = session.nmtBlock
        ? this.nmtPapers.block(session.nmtBlock)
        : null;
      const sitting = {
        sessionId: session.id,
        blockTitle: block?.title ?? null,
        correctAnswers: session.result.correctAnswers,
        totalQuestions: session.result.totalQuestions,
        accuracy: Number(session.result.accuracy),
        durationSeconds: session.durationSeconds,
        completedAt: session.completedAt,
      };
      // A provisional sitting has no paper scores and reads as its subject; a
      // sitting of papers reads as one attempt per paper, so a block shows in
      // the history of each of its subjects with that subject's own score —
      // in the order the block sets its papers.
      if (session.result.paperScores.length === 0) {
        return [
          {
            ...sitting,
            subject: session.subject,
            testPoints: null,
            maxTestPoints: null,
            scaledScore: null,
          },
        ];
      }
      const order = (slug: string) => {
        const index = block?.subjectSlugs.indexOf(slug) ?? -1;
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
      };
      return [...session.result.paperScores]
        .sort((a, b) => order(a.subject.slug) - order(b.subject.slug))
        .filter(
          (score) => subjectId === undefined || score.subject.id === subjectId,
        )
        .map((score) => ({
          ...sitting,
          subject: { id: score.subject.id, name: score.subject.name },
          testPoints: score.testPoints,
          maxTestPoints: score.maxTestPoints,
          scaledScore: score.scaledScore,
        }));
    });
  }

  /**
   * Starts — or resumes — one player's half of a duel.
   *
   * The questions come from the duel's frozen paper in its order, so both
   * players sit the same thing. Untimed here: the asynchronous duel's whole
   * premise is that the two play whenever they like, and the comparison is
   * what makes it a contest. A per-question clock belongs to the live variant.
   *
   * Occupies the self-study slot, like practice and mock exams — homework is
   * the only thing counted per subject.
   */
  async startForDuel(
    userId: string,
    params: {
      duelId: string;
      subjectId: string;
      topicId: string | null;
      questionIds: string[];
    },
  ): Promise<QuizSessionMetadata> {
    const resumable = await this.quizSessionRepository.findActiveForDuel(
      userId,
      params.duelId,
    );
    if (resumable) {
      return this.toMetadata(resumable);
    }

    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          duelId: params.duelId,
          subjectId: params.subjectId,
          topicId: params.topicId,
          mode: QuizType.DUEL,
          timerEnabled: false,
          questionCount: params.questionIds.length,
          expiresAt: null,
          questionIds: params.questionIds,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Starts — or resumes — a student's work on an assignment.
   *
   * Differs from `start` in three ways, all of them consequences of the
   * assignment being a frozen record rather than a generated quiz:
   *
   * - the questions come from the assignment's snapshot, in its order, so every
   *   recipient sits the same paper;
   * - the concurrency limit is per subject, not global (decision 13);
   * - an already-active session for this assignment is returned rather than
   *   refused, so closing the tab does not cost an attempt.
   *
   * Untimed by design: the deadline is the time pressure, and a per-question
   * timer on homework would punish the student who thinks before answering.
   * A mock exam set as homework is the exception, because the clock is the
   * exam: it runs as a mock sitting of the subject's paper — one clock for
   * the whole paper, scored by its table (decision 29).
   *
   * Validation of *whether* the student may start — recipient, open date,
   * attempts left — belongs to AssignmentsService, which owns those rules.
   */
  async startFromAssignment(
    userId: string,
    params: {
      assignmentId: string;
      subjectId: string;
      subjectSlug: string;
      questionIds: string[];
      mockExam: boolean;
    },
  ): Promise<QuizSessionMetadata> {
    const resumable = await this.quizSessionRepository.findActiveForAssignment(
      userId,
      params.assignmentId,
    );
    if (resumable) {
      return this.toMetadata(resumable);
    }

    const blocking =
      await this.quizSessionRepository.findActiveAssignmentInSubject(
        userId,
        params.subjectId,
      );
    if (blocking) {
      throw new ConflictException(ACTIVE_ASSIGNMENT_SESSION_MESSAGE);
    }

    // Carry the topic only when the whole paper sits in one — it feeds
    // per-topic statistics, and a mixed paper has no single honest answer.
    const topicId = await this.singleTopicOf(params.questionIds);
    const paper = params.mockExam
      ? this.nmtPapers.forSubjectSlug(params.subjectSlug)
      : null;

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          assignmentId: params.assignmentId,
          subjectId: params.subjectId,
          topicId: paper ? null : topicId,
          mode: paper ? QuizType.MOCK_EXAM : QuizType.SUBJECT_QUIZ,
          timerEnabled: paper !== null,
          questionCount: params.questionIds.length,
          expiresAt: paper
            ? new Date(Date.now() + paper.minutes * 60 * 1000)
            : null,
          questionIds: params.questionIds,
        }),
      );
      return this.toMetadata(session);
    } catch (error) {
      // The partial unique index is the concurrency backstop, exactly as it is
      // for self-study.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACTIVE_ASSIGNMENT_SESSION_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Whether this session's review may show explanations.
   *
   * Self-study always may: the session is over, and an explanation cannot give
   * away an answer that has already been submitted.
   *
   * Homework may withhold them until the deadline (`AFTER_DUE`), because
   * otherwise the first student to finish can hand the whole paper to the rest
   * of the class. `IMMEDIATE` and `AFTER_SUBMIT` behave identically here — the
   * engine has no mid-session feedback path, so "immediate" currently means
   * "as soon as the session ends". Wiring per-answer feedback is an engine
   * change, not a flag, and it is not in this phase.
   */
  private async explanationsVisibleFor(
    session: QuizSessionRecord,
  ): Promise<boolean> {
    if (!session.assignmentId) {
      return true;
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: session.assignmentId },
      select: { explanations: true, dueAt: true },
    });
    if (!assignment) {
      return true;
    }

    return (
      assignment.explanations !== ExplanationVisibility.AFTER_DUE ||
      assignment.dueAt.getTime() <= Date.now()
    );
  }

  /** The topic every one of these questions belongs to, or null if they differ. */
  private async singleTopicOf(questionIds: string[]): Promise<string | null> {
    const topics = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { topicId: true },
      distinct: ['topicId'],
    });
    return topics.length === 1 ? topics[0].topicId : null;
  }

  /**
   * The user's in-progress session, if any (docs/04-api/quiz.md §4a). Lets
   * the frontend offer a way back into it — before this existed, leaving the
   * quiz-taking screen without finishing meant the session id was gone from
   * everywhere the client could reach, and `start` would keep refusing a new
   * one with no way to resume the old one either. Reuses the same lookup
   * `start` already runs to enforce the one-active-session rule.
   *
   * Wrapped in `{ session }` rather than returning the metadata (or `null`)
   * directly: Nest treats a handler returning `null` the same as one
   * returning `undefined` — no body is sent at all, not the JSON literal
   * `null` — so a bare nullable return type would make "no active session"
   * indistinguishable from a broken response on the wire. Nesting it one
   * level keeps the outer value always a real object.
   */
  /**
   * How many questions a quiz over these filters could draw from
   * (docs/04-api/quiz.md §4a). Exists so a caller can size `questionCount`
   * before starting — mainly for the difficulty filter, where the advanced
   * tier holds only 8–10 questions per topic and a request for 10 or more
   * would otherwise fail with a 409 the caller had no way to anticipate.
   */
  async countAvailableQuestions(params: {
    subjectId: string;
    topicId?: string;
    difficulty?: Difficulty;
    format?: QuestionFormat;
  }): Promise<{ available: number }> {
    const available =
      await this.quizSessionRepository.countEligibleQuestions(params);
    return { available };
  }

  async findActive(
    userId: string,
  ): Promise<{ session: QuizSessionMetadata | null }> {
    const session = await this.quizSessionRepository.findActiveByUser(userId);
    return { session: session ? this.toMetadata(session) : null };
  }

  /**
   * Resolves the generation configuration for a start request (Phase 5.6,
   * decision B1 — XOR). A `quizId` loads everything from the published Quiz
   * (its stored `mode` is copied verbatim, decision B3); otherwise the ad-hoc
   * fields are required and the mode is derived from the topic (decision D2).
   * The two inputs are mutually exclusive.
   */
  private async resolveStartConfig(dto: StartQuizDto): Promise<StartConfig> {
    if (dto.quizId !== undefined) {
      if (
        dto.subjectId !== undefined ||
        dto.topicId !== undefined ||
        dto.questionCount !== undefined ||
        dto.timerEnabled !== undefined ||
        dto.onlyMistakes !== undefined ||
        dto.difficulty !== undefined ||
        dto.format !== undefined
      ) {
        throw new BadRequestException(QUIZ_ID_XOR_MESSAGE);
      }
      const quiz = await this.quizConfigService.findPublishedById(dto.quizId);
      if (!quiz) {
        // Unknown, unpublished, or soft-deleted are indistinguishable
        // (decision B2).
        throw new NotFoundException(QUIZ_NOT_FOUND_MESSAGE);
      }
      return {
        quizId: quiz.id,
        subjectId: quiz.subjectId,
        topicId: quiz.topicId,
        questionCount: quiz.questionCount,
        timerEnabled: quiz.timerEnabled,
        mode: quiz.mode,
        onlyMistakes: false,
        difficulty: null,
        format: null,
      };
    }

    if (dto.difficulty !== undefined && dto.onlyMistakes === true) {
      throw new BadRequestException(DIFFICULTY_WITH_MISTAKES_MESSAGE);
    }

    if (dto.format !== undefined && dto.onlyMistakes === true) {
      throw new BadRequestException(FORMAT_WITH_MISTAKES_MESSAGE);
    }

    if (
      dto.subjectId === undefined ||
      dto.questionCount === undefined ||
      dto.timerEnabled === undefined
    ) {
      throw new BadRequestException(MISSING_START_FIELDS_MESSAGE);
    }
    return {
      quizId: null,
      subjectId: dto.subjectId,
      topicId: dto.topicId ?? null,
      questionCount: dto.questionCount,
      timerEnabled: dto.timerEnabled,
      mode:
        dto.topicId === undefined
          ? QuizType.RANDOM_QUIZ
          : QuizType.SUBJECT_QUIZ,
      onlyMistakes: dto.onlyMistakes ?? false,
      difficulty: dto.difficulty ?? null,
      format: dto.format ?? null,
    };
  }

  /**
   * The session's questions for taking the quiz (docs/04-api/quiz.md §5) —
   * never the correct answers (decision D11). Lazily expires a timed-out
   * session first.
   */
  async getQuestions(
    userId: string,
    sessionId: string,
    requestedLocale: string | undefined,
  ): Promise<QuizQuestionView[]> {
    await this.loadCurrentSession(userId, sessionId);
    const locale = await this.settingsService.resolveLocale(
      requestedLocale,
      userId,
    );
    const questions = await this.quizSessionRepository.findSessionQuestions(
      sessionId,
      localeArg(locale),
    );
    return questions.map((question) =>
      this.toQuestionView(question, sessionId),
    );
  }

  /**
   * Resume state after a refresh or reconnect (docs/04-api/quiz.md §9): the
   * session, its questions, and the user's own saved selections — never
   * correctness (decision R6).
   */
  async resume(
    userId: string,
    sessionId: string,
    requestedLocale: string | undefined,
  ): Promise<QuizResumeView> {
    const session = await this.loadCurrentSession(userId, sessionId);
    const locale = await this.settingsService.resolveLocale(
      requestedLocale,
      userId,
    );
    const [questions, attempts] = await Promise.all([
      this.quizSessionRepository.findSessionQuestions(
        sessionId,
        localeArg(locale),
      ),
      this.questionAttemptRepository.findBySession(sessionId),
    ]);

    const sitting = await this.sittingFor(session);
    const sittingView: NmtSittingView | undefined = sitting
      ? {
          title: sitting.title,
          papers: sitting.papers.map(({ paper, subjectName }) => {
            const positions = questions.flatMap((question, index) =>
              question.subjectSlug === paper.subjectSlug ? [index] : [],
            );
            return {
              subjectName,
              title: paper.title,
              maxTestPoints: maxTestPoints(paper),
              sections: paper.sections,
              start: positions[0] ?? 0,
              count: positions.length,
            };
          }),
          taskNumbers: questions.map((question) => question.nmtTask),
          taskLabels: questions.map((question) => {
            const task = sitting.papers
              .find(({ paper }) => paper.subjectSlug === question.subjectSlug)
              ?.paper.tasks.find(
                (candidate) => candidate.number === question.nmtTask,
              );
            return task ? taskLabel(task) : null;
          }),
        }
      : undefined;

    return {
      session: this.toMetadata(session),
      ...(sittingView ? { sitting: sittingView } : {}),
      questions: questions.map((question) =>
        this.toQuestionView(question, sessionId),
      ),
      answers: attempts.map((attempt) => ({
        questionId: attempt.questionId,
        selectedAnswer: attempt.selectedAnswer,
      })),
    };
  }

  /**
   * Saves (upserts) an answer and evaluates it immediately
   * (docs/04-api/quiz.md §6, decisions D7/D8). The evaluation result is never
   * returned — correctness stays hidden until completion (decision D11).
   */
  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ): Promise<{ questionId: string; selectedAnswer: Prisma.JsonValue }> {
    const session = await this.loadCurrentSession(userId, sessionId);
    if (session.status !== QuizStatus.ACTIVE) {
      throw new ConflictException(SESSION_NOT_ACTIVE_MESSAGE);
    }

    const snapshotIds =
      await this.quizSessionRepository.findSnapshotQuestionIds(sessionId);
    if (!snapshotIds.includes(dto.questionId)) {
      // Indistinguishable from an unknown question — no leakage.
      throw new NotFoundException(QUESTION_NOT_IN_SESSION_MESSAGE);
    }

    const question = await this.findSnapshotQuestion(sessionId, dto.questionId);
    const isCorrect = evaluateAnswer(
      question.type,
      dto.selectedAnswer,
      question.answerOptions,
      question.configuration,
    );

    await this.questionAttemptRepository.upsert({
      quizSessionId: sessionId,
      questionId: dto.questionId,
      selectedAnswer: dto.selectedAnswer as Prisma.InputJsonValue,
      isCorrect,
      timeSpentSeconds: dto.timeSpentSeconds,
    });

    return {
      questionId: dto.questionId,
      selectedAnswer: dto.selectedAnswer as Prisma.JsonValue,
    };
  }

  /**
   * Completes the quiz (docs/04-api/quiz.md §7): atomically finalizes the
   * session, calculates the Result, awards XP, and updates Statistics
   * (decision D17). Already-completed sessions return 409.
   */
  async complete(
    userId: string,
    sessionId: string,
  ): Promise<QuizResultSummary> {
    const session = await this.loadSessionOrThrow(userId, sessionId);
    const summary = await this.finalize(session);
    if (!summary) {
      throw new ConflictException(SESSION_NOT_ACTIVE_MESSAGE);
    }
    return summary;
  }

  /**
   * The full post-completion review (docs/04-api/quiz.md §8, decision D25):
   * aggregate result plus, per question, the submission, the correct answer,
   * correctness, and the reserved explanation.
   */
  async getResult(
    userId: string,
    sessionId: string,
    requestedLocale: string | undefined,
  ): Promise<QuizReview> {
    const session = await this.loadCurrentSession(userId, sessionId);
    if (session.status !== QuizStatus.COMPLETED) {
      throw new ConflictException(SESSION_NOT_COMPLETED_MESSAGE);
    }

    const result = await this.resultRepository.findBySession(sessionId);
    if (!result) {
      // A completed session always has a result; treat a missing one as a
      // not-found rather than exposing internals.
      throw new NotFoundException(SESSION_NOT_FOUND_MESSAGE);
    }

    const locale = await this.settingsService.resolveLocale(
      requestedLocale,
      userId,
    );
    const [questions, attempts, xpEarned] = await Promise.all([
      this.quizSessionRepository.findSessionQuestions(
        sessionId,
        localeArg(locale),
      ),
      this.questionAttemptRepository.findBySession(sessionId),
      this.sumXp(sessionId),
    ]);

    const attemptByQuestion = new Map(
      attempts.map((attempt) => [attempt.questionId, attempt]),
    );
    const explanationsVisible = await this.explanationsVisibleFor(session);
    const nmt = await this.scoreSitting(session, attempts);

    const reviewQuestions: QuizReviewQuestion[] = questions.map((question) => {
      const attempt = attemptByQuestion.get(question.id);
      return {
        ...this.toQuestionView(question, sessionId),
        submittedAnswer: attempt?.selectedAnswer ?? null,
        correctAnswer: correctAnswerFor(
          question.type,
          question.answerOptions,
          question.configuration,
        ),
        isCorrect: attempt?.isCorrect ?? false,
        // Safe to reveal only here: the review runs after completion, so an
        // explanation can no longer give away an answer in progress. The
        // active-session view (`toQuestionView`) never carries this field.
        // Homework can withhold it further — see `explanationsVisibleFor`.
        explanation: explanationsVisible ? question.explanation : null,
      };
    });

    return {
      result: {
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        unansweredQuestions: result.unansweredQuestions,
        totalQuestions: result.totalQuestions,
        accuracy: result.accuracy,
        score: result.score,
        xpEarned,
        completedAt: result.completedAt.toISOString(),
      },
      questions: reviewQuestions,
      session: { subjectId: session.subjectId, topicId: session.topicId },
      ...(nmt
        ? {
            nmt: {
              title: nmt.sitting.title,
              papers: nmt.scores.map(({ paper, subjectName, score }) => ({
                subjectName,
                title: paper.title,
                testPoints: score.testPoints,
                maxTestPoints: score.maxTestPoints,
                scaledScore: score.scaledScore,
                threshold: paper.scale.threshold,
                scaleSource: paper.scale.source,
                tasks: score.tasks,
              })),
            },
          }
        : {}),
    };
  }

  /**
   * Loads a session the user owns, lazily completing it first if its timer
   * has expired (decisions D5/D6). A foreign or unknown session is 404
   * (decision D18).
   */
  private async loadCurrentSession(
    userId: string,
    sessionId: string,
  ): Promise<QuizSessionRecord> {
    const session = await this.loadSessionOrThrow(userId, sessionId);
    if (this.isExpired(session)) {
      await this.finalize(session);
      return this.loadSessionOrThrow(userId, sessionId);
    }
    return session;
  }

  private async loadSessionOrThrow(
    userId: string,
    sessionId: string,
  ): Promise<QuizSessionRecord> {
    const session = await this.quizSessionRepository.findByIdForUser(
      sessionId,
      userId,
    );
    if (!session) {
      throw new NotFoundException(SESSION_NOT_FOUND_MESSAGE);
    }
    return session;
  }

  private isExpired(session: QuizSessionRecord): boolean {
    return (
      session.status === QuizStatus.ACTIVE &&
      session.timerEnabled &&
      session.expiresAt !== null &&
      session.expiresAt.getTime() <= Date.now()
    );
  }

  /**
   * The single completion transaction (decision D17). Returns the result
   * summary, or null if the session was no longer ACTIVE (already completed
   * or a concurrent completer won) — the CAS guarantees XP and statistics are
   * applied exactly once.
   */
  private async finalize(
    session: QuizSessionRecord,
  ): Promise<QuizResultSummary | null> {
    const completedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((completedAt.getTime() - session.startedAt.getTime()) / 1000),
    );

    return this.prisma.$transaction(async (tx) => {
      const won = await this.quizSessionRepository.markCompletedIfActive(tx, {
        id: session.id,
        completedAt,
        durationSeconds,
      });
      if (!won) {
        return null;
      }

      const [snapshotIds, attempts] = await Promise.all([
        this.quizSessionRepository.findSnapshotQuestionIds(session.id, tx),
        this.questionAttemptRepository.findBySession(session.id, tx),
      ]);
      const tally = this.tally(snapshotIds.length, attempts);
      const accuracy = round2(tally.exactAccuracy);
      // A mock sitting of an NMT paper is also scored the exam's way, in the
      // same transaction, so its history never disagrees with its review.
      const nmt = await this.scoreSitting(session, attempts);
      // A teacher sits a paper to see what their students will face
      // (decision 29). The score is theirs to read, but XP, a level, the
      // review ladder and the running totals are a learner's progress — a
      // teacher's statistics are about their groups, so none of it moves.
      const sitter = await tx.user.findUnique({
        where: { id: session.userId },
        select: { role: true },
      });
      const learner = sitter?.role !== UserRole.TEACHER;
      const awards = learner ? this.xpAwards(tally.exactAccuracy) : [];

      const result = await this.resultRepository.create(tx, {
        quizSessionId: session.id,
        correctAnswers: tally.correctAnswers,
        incorrectAnswers: tally.incorrectAnswers,
        unansweredQuestions: tally.unansweredQuestions,
        totalQuestions: tally.totalQuestions,
        accuracy,
        score: accuracy,
        paperScores: (nmt?.scores ?? []).map(({ subjectId, score }) => ({
          subjectId,
          testPoints: score.testPoints,
          maxTestPoints: score.maxTestPoints,
          scaledScore: score.scaledScore,
        })),
        completedAt,
      });

      // The review ladder moves with the same transaction that writes the
      // result: a session that counted towards statistics but left the
      // schedule untouched would keep asking about material the learner has
      // just recovered.
      for (const attempt of learner ? attempts : []) {
        if (attempt.isCorrect) {
          await this.mistakeReviewRepository.promote(
            tx,
            session.userId,
            attempt.questionId,
          );
        } else {
          await this.mistakeReviewRepository.demote(
            tx,
            session.userId,
            attempt.questionId,
          );
        }
      }

      if (learner) {
        await this.statisticsService.applyQuizCompletion(tx, {
          userId: session.userId,
          quizSessionId: session.id,
          resultId: result.id,
          totalQuestions: tally.totalQuestions,
          correctAnswers: tally.correctAnswers,
          incorrectAnswers: tally.incorrectAnswers + tally.unansweredQuestions,
          learningTimeSeconds: durationSeconds,
          awards,
        });
      }

      const xpEarned = awards.reduce((sum, award) => sum + award.amount, 0);
      return {
        correctAnswers: tally.correctAnswers,
        incorrectAnswers: tally.incorrectAnswers,
        unansweredQuestions: tally.unansweredQuestions,
        totalQuestions: tally.totalQuestions,
        accuracy: accuracy.toFixed(2),
        score: accuracy.toFixed(2),
        xpEarned,
        completedAt: completedAt.toISOString(),
      };
    });
  }

  private tally(
    totalQuestions: number,
    attempts: { isCorrect: boolean }[],
  ): Tally {
    const answered = attempts.length;
    const correctAnswers = attempts.filter(
      (attempt) => attempt.isCorrect,
    ).length;
    const incorrectAnswers = answered - correctAnswers;
    const unansweredQuestions = totalQuestions - answered;
    // Unanswered questions count against accuracy via the total denominator
    // (decision D12).
    const exactAccuracy =
      totalQuestions === 0 ? 0 : (correctAnswers / totalQuestions) * 100;
    return {
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions,
      totalQuestions,
      exactAccuracy,
    };
  }

  /**
   * XP awards for a completed quiz (decisions D13/R2/R5): always a
   * QUIZ_COMPLETION row of round-half-up(accuracy) — even 0 — plus a
   * HIGH_ACCURACY_BONUS row when the exact accuracy is at least 90%.
   */
  private xpAwards(exactAccuracy: number): XpAward[] {
    const awards: XpAward[] = [
      { amount: Math.round(exactAccuracy), reason: XPSource.QUIZ_COMPLETION },
    ];
    if (exactAccuracy >= HIGH_ACCURACY_THRESHOLD) {
      awards.push({
        amount: HIGH_ACCURACY_BONUS_XP,
        reason: XPSource.HIGH_ACCURACY_BONUS,
      });
    }
    return awards;
  }

  private async sumXp(sessionId: string): Promise<number> {
    const aggregate = await this.prisma.xPTransaction.aggregate({
      where: { quizSessionId: sessionId },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  private async findSnapshotQuestion(
    sessionId: string,
    questionId: string,
  ): Promise<SessionQuestionRecord> {
    const questions =
      await this.quizSessionRepository.findSessionQuestions(sessionId);
    const question = questions.find((candidate) => candidate.id === questionId);
    if (!question) {
      throw new NotFoundException(QUESTION_NOT_IN_SESSION_MESSAGE);
    }
    return question;
  }

  private toMetadata(session: QuizSessionRecord): QuizSessionMetadata {
    return {
      sessionId: session.id,
      mode: session.mode,
      subjectId: session.subjectId,
      topicId: session.topicId,
      questionCount: session.questionCount,
      timerEnabled: session.timerEnabled,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
    };
  }

  /** Strips the correct answer (isCorrect, configuration) — decision D11. */
  /**
   * One question as the client sees it. `sessionId` seeds the matching shuffle
   * — see matching-shuffle.util — so the same session always deals the same
   * order and the review matches what the reader answered on.
   */
  private toQuestionView(
    question: SessionQuestionRecord,
    sessionId: string,
  ): QuizQuestionView {
    // How many options are prompts, read from the key's pair count. The key
    // itself never leaves the server while the session is active — only this
    // count does, and it says nothing about which choice fits which prompt.
    const promptCount = matchingPromptCount(question.configuration);
    return {
      id: question.id,
      type: question.type,
      subjectSlug: question.subjectSlug,
      title: question.translations[0]?.title ?? question.title,
      difficulty: question.difficulty,
      imageUrl: question.imageUrl,
      passage: question.passage,
      passageOrder: question.passageOrder,
      ...(question.type === QuestionType.MATCHING ? { promptCount } : {}),
      answerOptions: shuffleMatchingOrder(
        question.type,
        question.answerOptions.map((option) => ({
          id: option.id,
          content: option.translations[0]?.content ?? option.content,
          imageUrl: option.imageUrl,
          order: option.order,
        })),
        `${sessionId}:${question.id}`,
        promptCount,
      ),
    };
  }
}

/**
 * Number of prompts in a MATCHING key — one per pair. Zero for anything else,
 * or for a malformed configuration, which leaves the shuffle a no-op rather
 * than guessing a split point.
 */
function matchingPromptCount(configuration: Prisma.JsonValue): number {
  if (
    typeof configuration !== 'object' ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    return 0;
  }
  const pairs = (configuration as { pairs?: unknown }).pairs;
  return Array.isArray(pairs) ? pairs.length : 0;
}

/** English rides on the base records — no translation join needed. */
function localeArg(locale: Language): Language | undefined {
  return locale === Language.ENGLISH ? undefined : locale;
}

/** Round to two decimals for the Decimal(5,2) accuracy/score columns. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
