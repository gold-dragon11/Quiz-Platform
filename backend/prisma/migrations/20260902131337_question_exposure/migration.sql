-- CreateTable
CREATE TABLE "question_exposures" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_exposures_userId_shownAt_idx" ON "question_exposures"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "question_exposures_userId_questionId_shownAt_idx" ON "question_exposures"("userId", "questionId", "shownAt");

-- AddForeignKey
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
