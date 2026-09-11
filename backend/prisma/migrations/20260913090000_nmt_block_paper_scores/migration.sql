-- AlterTable
ALTER TABLE "quiz_sessions" ADD COLUMN     "nmtBlock" TEXT;

-- CreateTable
CREATE TABLE "result_paper_scores" (
    "id" UUID NOT NULL,
    "resultId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "testPoints" INTEGER NOT NULL,
    "maxTestPoints" INTEGER NOT NULL,
    "scaledScore" INTEGER,

    CONSTRAINT "result_paper_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_paper_scores_subjectId_idx" ON "result_paper_scores"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "result_paper_scores_resultId_subjectId_key" ON "result_paper_scores"("resultId", "subjectId");

-- AddForeignKey
ALTER TABLE "result_paper_scores" ADD CONSTRAINT "result_paper_scores_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_paper_scores" ADD CONSTRAINT "result_paper_scores_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Scores already recorded on results move to the new table: a sitting of one
-- subject is scored in its session's subject.
INSERT INTO "result_paper_scores" ("id", "resultId", "subjectId", "testPoints", "maxTestPoints", "scaledScore")
SELECT gen_random_uuid(), r."id", s."subjectId", r."testPoints", r."maxTestPoints", r."scaledScore"
FROM "results" r
JOIN "quiz_sessions" s ON s."id" = r."quizSessionId"
WHERE r."testPoints" IS NOT NULL AND r."maxTestPoints" IS NOT NULL;

-- AlterTable
ALTER TABLE "results" DROP COLUMN "maxTestPoints",
DROP COLUMN "scaledScore",
DROP COLUMN "testPoints";
