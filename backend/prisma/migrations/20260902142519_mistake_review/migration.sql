-- CreateTable
CREATE TABLE "mistake_reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "clearedAt" TIMESTAMP(3),
    "timesWrong" INTEGER NOT NULL DEFAULT 1,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mistake_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mistake_reviews_userId_clearedAt_dueAt_idx" ON "mistake_reviews"("userId", "clearedAt", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "mistake_reviews_userId_questionId_key" ON "mistake_reviews"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
