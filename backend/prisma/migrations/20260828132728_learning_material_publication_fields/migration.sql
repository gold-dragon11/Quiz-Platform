-- Brings LearningMaterial in line with every other content entity: a slug for
-- readable URLs, an explicit order, a publication flag so drafts are possible,
-- and a soft-delete column so removal is reversible and slugs stay reserved.
--
-- The NOT NULL columns carry no default because the table is empty: materials
-- are authored from `prisma/seed/content/<subject>/materials/*.md`, and none
-- have been seeded yet.
ALTER TABLE "learning_materials" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "displayOrder" INTEGER NOT NULL,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "learning_materials_subjectId_slug_key" ON "learning_materials"("subjectId", "slug");
