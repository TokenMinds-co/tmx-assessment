import { NestFactory } from '@nestjs/core';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { AppModule } from '../app.module';
import { AssessmentSeedService } from '../assessments/assessment-seed.service';

/**
 * Loads the prefilled tests from seed/ into the database, with their audio.
 * Tests that already exist are skipped; --force rewrites them from the files.
 * Run it from the backend folder: pnpm db:seed. See docs/assessments.md.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      force: { type: 'boolean', default: false },
      dir: { type: 'string', default: 'seed' },
    },
  });

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const results = await app
      .get(AssessmentSeedService)
      .seed(resolve(values.dir), { force: values.force });
    for (const result of results) {
      const media = result.mediaUploaded
        ? `, ${result.mediaUploaded} audio files uploaded`
        : '';
      console.log(`${result.slug}: ${result.action}${media}`);
    }
    if (results.some((result) => result.action === 'skipped')) {
      console.log(
        'Skipped tests already exist. Run with --force to rewrite them from the files.',
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
