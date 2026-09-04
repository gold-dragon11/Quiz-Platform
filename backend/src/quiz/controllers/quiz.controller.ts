import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AvailableQuestionsQueryDto } from '../dto/available-questions-query.dto';
import { MockExamHistoryQueryDto } from '../dto/mock-exam-history-query.dto';
import { MockExamSpecQueryDto } from '../dto/mock-exam-spec-query.dto';
import { MistakeReviewSummary } from '../repositories/mistake-review.repository';
import { StartMistakeReviewDto } from '../dto/start-mistake-review.dto';
import { QuizLocaleQueryDto } from '../dto/quiz-locale-query.dto';
import { StartMockExamDto } from '../dto/start-mock-exam.dto';
import { StartQuizDto } from '../dto/start-quiz.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { QuizService } from '../services/quiz.service';
import {
  MockExamAttempt,
  QuizQuestionView,
  QuizResultSummary,
  QuizResumeView,
  QuizReview,
  QuizSessionMetadata,
} from '../types/quiz.types';

/**
 * Quiz engine endpoints (docs/04-api/quiz.md). All require authentication —
 * any role. Every operation is scoped to the authenticated user; a session
 * that is not theirs is 404 (decision D18).
 */
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * POST /api/v1/quiz/mock-exam/start — a full sitting under exam conditions:
   * a fixed paper, one clock for the whole thing, nothing to configure.
   */
  @Post('mock-exam/start')
  @HttpCode(HttpStatus.CREATED)
  async startMockExam(
    @CurrentUser('id') userId: string,
    @Body() dto: StartMockExamDto,
  ): Promise<QuizSessionMetadata> {
    return this.quizService.startMockExam(userId, dto);
  }

  /**
   * GET /api/v1/quiz/mock-exam/history — past sittings, oldest first.
   * Deliberately no converted exam score: the official conversion table is not
   * something to invent, so this reports what happened rather than what it
   * would have been worth.
   */
  @Get('mock-exam/history')
  async mockExamHistory(
    @CurrentUser('id') userId: string,
    @Query() query: MockExamHistoryQueryDto,
  ): Promise<MockExamAttempt[]> {
    return this.quizService.mockExamHistory(userId, query.subjectId);
  }

  /**
   * GET /api/v1/quiz/mock-exam/spec — what a sitting in this subject will be:
   * how many questions, how many minutes.
   *
   * Exposed rather than published as a constant the client repeats, because
   * these numbers are provisional until the official specification is checked
   * (see mock-exam.config.ts). A duplicated "30 questions, 60 minutes" in the
   * UI would keep saying so long after the real numbers land here.
   */
  @Get('mock-exam/spec')
  async mockExamSpec(
    @Query() query: MockExamSpecQueryDto,
  ): Promise<{ questionCount: number; minutes: number }> {
    return this.quizService.mockExamSpec(query.subjectId);
  }

  /**
   * POST /api/v1/quiz/mistake-review/start — today's due mistakes, at
   * widening intervals. Nothing due is a 409, not an empty session: an
   * empty quiz is a bug-shaped experience.
   */
  @Post('mistake-review/start')
  @HttpCode(HttpStatus.CREATED)
  async startMistakeReview(
    @CurrentUser('id') userId: string,
    @Body() dto: StartMistakeReviewDto,
  ): Promise<QuizSessionMetadata> {
    return this.quizService.startMistakeReview(userId, dto);
  }

  /**
   * GET /api/v1/quiz/mistake-review — how much is due today, still on the
   * ladder, and already fixed. The last number is the one worth showing a
   * learner: it is the only place the product says "you got better".
   */
  @Get('mistake-review')
  async mistakeReviewSummary(
    @CurrentUser('id') userId: string,
  ): Promise<MistakeReviewSummary> {
    return this.quizService.mistakeReviewSummary(userId);
  }

  /** POST /api/v1/quiz/start — creates an ACTIVE session with its questions. */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @CurrentUser('id') userId: string,
    @Body() startQuizDto: StartQuizDto,
  ): Promise<QuizSessionMetadata> {
    return this.quizService.start(userId, startQuizDto);
  }

  /**
   * GET /api/v1/quiz/available — how many questions an ad-hoc quiz over these
   * filters could draw from. Declared before `:sessionId` for the same reason
   * as `active`: the literal path must not be read as a session id.
   */
  @Get('available')
  async getAvailable(
    @Query() query: AvailableQuestionsQueryDto,
  ): Promise<{ available: number }> {
    return this.quizService.countAvailableQuestions(query);
  }

  /**
   * GET /api/v1/quiz/active — the user's in-progress session, wrapped as
   * `{ session }` (`null` when there is none — see the service docstring for
   * why it is nested rather than returned bare). Declared before
   * `:sessionId` so the literal path `active` is never swallowed by that
   * route's UUID param.
   */
  @Get('active')
  async getActive(
    @CurrentUser('id') userId: string,
  ): Promise<{ session: QuizSessionMetadata | null }> {
    return this.quizService.findActive(userId);
  }

  /** GET /api/v1/quiz/{sessionId} — resume state with saved answers. */
  @Get(':sessionId')
  async resume(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: QuizLocaleQueryDto,
  ): Promise<QuizResumeView> {
    return this.quizService.resume(userId, sessionId, query.locale);
  }

  /** GET /api/v1/quiz/{sessionId}/questions — the quiz-taking question set. */
  @Get(':sessionId/questions')
  async getQuestions(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: QuizLocaleQueryDto,
  ): Promise<QuizQuestionView[]> {
    return this.quizService.getQuestions(userId, sessionId, query.locale);
  }

  /** POST /api/v1/quiz/{sessionId}/answers — saves and evaluates an answer. */
  @Post(':sessionId/answers')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
  ): Promise<{ questionId: string; selectedAnswer: Prisma.JsonValue }> {
    return this.quizService.submitAnswer(userId, sessionId, submitAnswerDto);
  }

  /** POST /api/v1/quiz/{sessionId}/complete — finalizes and scores the quiz. */
  @Post(':sessionId/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<QuizResultSummary> {
    return this.quizService.complete(userId, sessionId);
  }

  /** GET /api/v1/quiz/{sessionId}/result — full post-completion review. */
  @Get(':sessionId/result')
  async getResult(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: QuizLocaleQueryDto,
  ): Promise<QuizReview> {
    return this.quizService.getResult(userId, sessionId, query.locale);
  }
}
