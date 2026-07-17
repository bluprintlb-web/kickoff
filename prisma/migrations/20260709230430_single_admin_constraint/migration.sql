-- Only one User row may ever have role = 'ADMIN'. This isn't expressible in
-- schema.prisma (Prisma has no partial/filtered unique constraint syntax),
-- so it's hand-written here. It holds even against direct SQL/Prisma Studio
-- edits, not just app code -- the app itself has no path to create a second
-- admin anyway (role is only ever changed by hand in the database).
CREATE UNIQUE INDEX "User_single_admin" ON "User" ("role") WHERE "role" = 'ADMIN';
