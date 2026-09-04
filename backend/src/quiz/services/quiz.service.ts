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
  QuizStatus,
  QuizType,
  XPSource,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuizConfigService } from '../../quizzes/services/quiz-config.service';
import { SettingsService } from '../../settings/services/settings.service';
import { StatisticsService } from '../../statistics/services/statistics.service';
import { XpAward } from '../../statistics/repositories/statistics.repository';
import { StartMistakeReviewDto } from '../dto/start-mistake-review.dto';
import { StartMockExamDto } from '../dto/start-mock-exam.dto';
import { StartQuizDto } from '../dto/start-quiz.dto';
import { mockExamSpecFor, questionsPerDifficulty } from '../mock-exam.config';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { correctAnswerFor, evaluateAnswer } from '../quiz-answer.util';
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
const MOCK_EXAM_TOO_SHORT_MESSAGE =
  'У цьому предметі поки замало опублікованих питань для пробного тесту.';
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
    const subject = await this.quizSessionRepository.findSubjectForMock(
      dto.subjectId,
    );
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    if (await this.quizSessionRepository.findActiveSelfStudy(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
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
   * The shape of a sitting in this subject, for a client that wants to say
   * what the student is about to walk into before they start.
   *
   * Only the two numbers a learner acts on. The difficulty mix stays private:
   * it is a generation detail, and publishing it would invite gaming a paper
   * whose whole point is that it is not configurable.
   */
  async mockExamSpec(
    subjectId: string,
  ): Promise<{ questionCount: number; minutes: number }> {
    const subject =
      await this.quizSessionRepository.findSubjectForMock(subjectId);
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    const spec = mockExamSpecFor(subject.slug);
    return { questionCount: spec.questionCount, minutes: spec.minutes };
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

    return sessions.flatMap((session) =>
      session.result && session.completedAt
        ? [
            {
              sessionId: session.id,
              subject: session.subject,
              correctAnswers: session.result.correctAnswers,
              totalQuestions: session.result.totalQuestions,
              accuracy: Number(session.result.accuracy),
              durationSeconds: session.durationSeconds,
              completedAt: session.completedAt,
            },
          ]
        : [],
    );
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
   *
   * Validation of *whether* the student may start — recipient, open date,
   * attempts left — belongs to AssignmentsService, which owns those rules.
   */
  async startFromAssignment(
    userId: string,
    params: {
      assignmentId: string;
      subjectId: string;
      questionIds: string[];
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

    try {
      const session = await this.prisma.$transaction((tx) =>
        this.quizSessionRepository.createSessionWithQuestions(tx, {
          userId,
          quizId: null,
          assignmentId: params.assignmentId,
          subjectId: params.subjectId,
          topicId,
          mode: QuizType.SUBJECT_QUIZ,
          timerEnabled: false,
          questionCount: params.questionIds.length,
          expiresAt: null,
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
        dto.difficulty !== undefined
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
      };
    }

    if (dto.difficulty !== undefined && dto.onlyMistakes === true) {
      throw new BadRequestException(DIFFICULTY_WITH_MISTAKES_MESSAGE);
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
    return questions.map((question) => this.toQuestionView(question));
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

    return {
      session: this.toMetadata(session),
      questions: questions.map((question) => this.toQuestionView(question)),
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

    const reviewQuestions: QuizReviewQuestion[] = questions.map((question) => {
      const attempt = attemptByQuestion.get(question.id);
      return {
        ...this.toQuestionView(question),
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
      const awards = this.xpAwards(tally.exactAccuracy);

      const result = await this.resultRepository.create(tx, {
        quizSessionId: session.id,
        correctAnswers: tally.correctAnswers,
        incorrectAnswers: tally.incorrectAnswers,
        unansweredQuestions: tally.unansweredQuestions,
        totalQuestions: tally.totalQuestions,
        accuracy,
        score: accuracy,
        completedAt,
      });

      // The review ladder moves with the same transaction that writes the
      // result: a session that counted towards statistics but left the
      // schedule untouched would keep asking about material the learner has
      // just recovered.
      for (const attempt of attempts) {
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
  private toQuestionView(question: SessionQuestionRecord): QuizQuestionView {
    return {
      id: question.id,
      type: question.type,
      title: question.translations[0]?.title ?? question.title,
      difficulty: question.difficulty,
      imageUrl: question.imageUrl,
      answerOptions: question.answerOptions.map((option) => ({
        id: option.id,
        content: option.translations[0]?.content ?? option.content,
        imageUrl: option.imageUrl,
        order: option.order,
      })),
    };
  }
}

/** English rides on the base records — no translation join needed. */
function localeArg(locale: Language): Language | undefined {
  return locale === Language.ENGLISH ? undefined : locale;
}

/** Round to two decimals for the Decimal(5,2) accuracy/score columns. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
