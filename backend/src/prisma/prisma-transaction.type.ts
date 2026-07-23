import { Prisma } from '@prisma/client';

/**
 * The Prisma client surface available inside an interactive transaction
 * (`prisma.$transaction(async (tx) => ...)`). Repositories accept this so a
 * service can compose several repositories' writes into one atomic unit —
 * e.g. quiz completion spanning results, XP, and statistics
 * (docs/06-backend/services.md §8).
 */
export type PrismaTransactionClient = Prisma.TransactionClient;
