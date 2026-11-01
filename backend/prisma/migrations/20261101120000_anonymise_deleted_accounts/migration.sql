-- Decision 47: a deleted account keeps its history but nothing that names the
-- person. New deletions are anonymised by the application
-- (src/auth/deleted-account.ts); this does the same, once, for the accounts
-- deleted before that rule existed. Running it again changes nothing.

UPDATE "users"
SET "email" = 'deleted-' || "id"::text || '@deleted.invalid',
    "passwordHash" = '',
    "lastLoginAt" = NULL
WHERE "accountStatus" = 'DELETED';

UPDATE "profiles" AS p
SET "displayName" = 'Видалений користувач',
    "username" = 'deleted_' || substr(replace(u."id"::text, '-', ''), 1, 20),
    "bio" = NULL
FROM "users" AS u
WHERE p."userId" = u."id" AND u."accountStatus" = 'DELETED';

UPDATE "avatars" AS a
SET "type" = 'PREDEFINED',
    "imageUrl" = '/avatars/default.png'
FROM "users" AS u
WHERE a."userId" = u."id" AND u."accountStatus" = 'DELETED';

DELETE FROM "study_subjects" AS s
USING "users" AS u
WHERE s."userId" = u."id" AND u."accountStatus" = 'DELETED';

DELETE FROM "refresh_tokens" AS r
USING "users" AS u
WHERE r."userId" = u."id" AND u."accountStatus" = 'DELETED';
