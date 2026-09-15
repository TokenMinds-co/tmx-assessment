import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Used by the Prisma CLI (migrate, generate, studio). The app itself connects
// in src/prisma/prisma.service.ts. See docs/database.md.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read directly instead of with env(), which throws when the variable is
    // missing. That way `prisma generate` (run on install) works before .env
    // exists; commands that connect still fail with a clear error.
    url: process.env.DATABASE_URL ?? '',
  },
});
