-- AlterTable
ALTER TABLE "quiz_sessions" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "quiz_session_questions" (
    "id" UUID NOT NULL,
    "quizSessionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_session_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_session_questions_quizSessionId_idx" ON "quiz_session_questions"("quizSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_session_questions_quizSessionId_questionId_key" ON "quiz_session_questions"("quizSessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_session_questions_quizSessionId_position_key" ON "quiz_session_questions"("quizSessionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "question_attempts_quizSessionId_questionId_key" ON "question_attempts"("quizSessionId", "questionId");

-- AddForeignKey
ALTER TABLE "quiz_session_questions" ADD CONSTRAINT "quiz_session_questions_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_session_questions" ADD CONSTRAINT "quiz_session_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Partial unique index: at most one ACTIVE quiz session per user
-- (docs/04-api/quiz.md §4, decision D4). Prisma cannot express a partial
-- unique index, so it is declared here directly.
CREATE UNIQUE INDEX "quiz_sessions_one_active_per_user"
  ON "quiz_sessions"("userId")
  WHERE "status" = 'ACTIVE';
