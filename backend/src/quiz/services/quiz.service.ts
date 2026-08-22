import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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
import { StartQuizDto } from '../dto/start-quiz.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { correctAnswerFor, evaluateAnswer } from '../quiz-answer.util';
import { QuestionAttemptRepository } from '../repositories/question-attempt.repository';
import {
  QuizSessionRecord,
  QuizSessionRepository,
  SessionQuestionRecord,
} from '../repositories/quiz-session.repository';
import { ResultRepository } from '../repositories/result.repository';
import {
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
const ACTIVE_SESSION_EXISTS_MESSAGE =
  'Активна сесія тесту вже існує. Завершіть її, перш ніж починати нову.';
const INSUFFICIENT_QUESTIONS_MESSAGE =
  'Для цього тесту бракує опублікованих питань.';
const SESSION_NOT_ACTIVE_MESSAGE = 'Ця сесія тесту неактивна.';
const SESSION_NOT_COMPLETED_MESSAGE = 'Ця сесія тесту ще не завершена.';
const QUESTION_NOT_IN_SESSION_MESSAGE = 'Це питання не належить до цієї сесії.';
const QUIZ_NOT_FOUND_MESSAGE = 'Тест не знайдено.';
const QUIZ_ID_XOR_MESSAGE =
  'Provide either quizId or the ad-hoc fields (subjectId, topicId, questionCount, timerEnabled), not both.';
const MISSING_START_FIELDS_MESSAGE =
  'subjectId, questionCount, and timerEnabled are required when quizId is not provided.';

/** The resolved generation config for a start request (Phase 5.6). */
interface StartConfig {
  quizId: string | null;
  subjectId: string;
  topicId: string | null;
  questionCount: number;
  timerEnabled: boolean;
  mode: QuizType;
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
  ) {}

  /**
   * Starts a new quiz (docs/04-api/quiz.md §4). Resolves the generation
   * configuration from either a stored Quiz or the ad-hoc request (Phase 5.6),
   * then, in one transaction: enforces the single-active-session rule
   * (decision D4), selects the random published question set (decisions
   * D21/D23), and creates the ACTIVE session with its snapshot and timer
   * deadline (decisions D1/D3/D5).
   */
  async start(userId: string, dto: StartQuizDto): Promise<QuizSessionMetadata> {
    const config = await this.resolveStartConfig(dto);

    if (await this.quizSessionRepository.findActiveByUser(userId)) {
      throw new ConflictException(ACTIVE_SESSION_EXISTS_MESSAGE);
    }

    const questionIds =
      await this.quizSessionRepository.selectRandomQuestionIds({
        subjectId: config.subjectId,
        topicId: config.topicId ?? undefined,
        count: config.questionCount,
      });
    if (questionIds.length < config.questionCount) {
      throw new ConflictException(INSUFFICIENT_QUESTIONS_MESSAGE);
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
        dto.timerEnabled !== undefined
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
      };
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
        explanation: null,
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
