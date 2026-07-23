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
import { QuizLocaleQueryDto } from '../dto/quiz-locale-query.dto';
import { StartQuizDto } from '../dto/start-quiz.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { QuizService } from '../services/quiz.service';
import {
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

  /** POST /api/v1/quiz/start — creates an ACTIVE session with its questions. */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @CurrentUser('id') userId: string,
    @Body() startQuizDto: StartQuizDto,
  ): Promise<QuizSessionMetadata> {
    return this.quizService.start(userId, startQuizDto);
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
