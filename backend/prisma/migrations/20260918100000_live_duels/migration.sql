-- Live duels (docs/02-domain/duel.md §5): the clock per question, when the
-- game started, and who surrendered.
ALTER TABLE "duels" ADD COLUMN "secondsPerQuestion" INTEGER;
ALTER TABLE "duels" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "duels" ADD COLUMN "forfeitedById" UUID;
