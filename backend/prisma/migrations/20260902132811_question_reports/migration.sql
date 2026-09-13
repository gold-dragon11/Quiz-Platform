-- CreateEnum
CREATE TYPE "QuestionReportReason" AS ENUM ('WRONG_ANSWER', 'TYPO', 'UNCLEAR', 'BROKEN_FORMULA', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionReportStatus" AS ENUM ('NEW', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "question_reports" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "reportedById" UUID NOT NULL,
    "reason" "QuestionReportReason" NOT NULL,
    "comment" TEXT,
    "status" "QuestionReportStatus" NOT NULL DEFAULT 'NEW',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_reports_status_createdAt_idx" ON "question_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "question_reports_questionId_idx" ON "question_reports"("questionId");

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One OPEN report per person per question.
--
-- The same reader hitting the same broken question in three different quizzes
-- is one complaint, not three, and a queue full of duplicates is a queue
-- nobody works through. Resolved reports are deliberately outside the
-- constraint: once a report is closed, the same person may raise the question
-- again — the second complaint after a rejection is a signal, not noise.
CREATE UNIQUE INDEX "question_reports_one_open_per_reporter"
    ON "question_reports" ("questionId", "reportedById")
    WHERE "status" = 'NEW';
