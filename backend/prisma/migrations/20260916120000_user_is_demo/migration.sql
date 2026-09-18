-- Public demonstration accounts, rebuilt every night (deployment.md §17.9).
ALTER TABLE "users" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
