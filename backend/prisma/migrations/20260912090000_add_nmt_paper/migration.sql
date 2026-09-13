-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "nmtTask" INTEGER;

-- AlterTable
ALTER TABLE "results" ADD COLUMN     "maxTestPoints" INTEGER,
ADD COLUMN     "scaledScore" INTEGER,
ADD COLUMN     "testPoints" INTEGER;

-- CreateIndex
CREATE INDEX "questions_nmtTask_idx" ON "questions"("nmtTask");

