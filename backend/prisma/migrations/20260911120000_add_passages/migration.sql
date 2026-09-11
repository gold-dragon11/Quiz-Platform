-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "passageId" UUID,
ADD COLUMN     "passageOrder" INTEGER;

-- CreateTable
CREATE TABLE "passages" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passages_topicId_slug_key" ON "passages"("topicId", "slug");

-- CreateIndex
CREATE INDEX "questions_passageId_idx" ON "questions"("passageId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

