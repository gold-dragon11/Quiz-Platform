-- CreateTable
CREATE TABLE "nmt_calendar" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mainSessionStart" DATE NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nmt_calendar_pkey" PRIMARY KEY ("id")
);
