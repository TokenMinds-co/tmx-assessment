import { Inject, Injectable } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AssessmentStatus } from '../generated/prisma/enums';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_STORAGE, type FileStorage } from '../storage/file-storage';
import { AssessmentImportService } from './assessment-import.service';
import { validateCanonical } from './canonical/canonical.dto';
import type { CanonicalAssessment } from './canonical/canonical.types';
import { documentProblems } from './canonical/document-rules';

export interface SeedResult {
  slug: string;
  action: 'created' | 'replaced' | 'skipped';
  mediaUploaded: number;
}

/**
 * Loads the prefilled tests in seed/: canonical JSON in seed/assessments/ and
 * their audio in seed/media/. Existing tests are left alone unless `force`.
 */
@Injectable()
export class AssessmentSeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: AssessmentImportService,
    private readonly media: MediaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async seed(
    dir: string,
    { force }: { force: boolean },
  ): Promise<SeedResult[]> {
    const folder = join(dir, 'assessments');
    const files = (await readdir(folder))
      .filter((f) => f.endsWith('.json'))
      .sort();
    const results: SeedResult[] = [];

    for (const file of files) {
      const document = await readSeedFile(join(folder, file));
      const existing = await this.prisma.assessment.findUnique({
        where: { slug: document.slug },
        select: { id: true },
      });
      if (existing && !force) {
        results.push({
          slug: document.slug,
          action: 'skipped',
          mediaUploaded: 0,
        });
        continue;
      }

      const mediaUploaded = await this.ensureMedia(
        join(dir, 'media'),
        document,
      );
      if (existing) {
        await this.importer.replace(
          existing.id,
          document,
          AssessmentStatus.PUBLISHED,
        );
      } else {
        await this.importer.create(document, {
          createdById: null,
          status: AssessmentStatus.PUBLISHED,
        });
      }
      results.push({
        slug: document.slug,
        action: existing ? 'replaced' : 'created',
        mediaUploaded,
      });
    }
    return results;
  }

  /** Uploads each file the test names, unless one with that name is already stored. */
  private async ensureMedia(
    folder: string,
    document: CanonicalAssessment,
  ): Promise<number> {
    const names = new Set(
      document.questions.flatMap((question) => question.media?.file ?? []),
    );
    let uploaded = 0;
    for (const name of names) {
      const existing = await this.prisma.mediaAsset.findFirst({
        where: { originalName: name },
        orderBy: { createdAt: 'desc' },
      });
      if (existing && (await this.storage.localPath(existing.key))) continue;
      const data = await readFile(join(folder, name));
      await this.media.upload({ data, originalName: name }, null);
      uploaded++;
    }
    return uploaded;
  }
}

/** Reads and checks one seed file. Throws with every problem it finds. */
export async function readSeedFile(path: string): Promise<CanonicalAssessment> {
  const { document, errors } = await validateCanonical(
    JSON.parse(await readFile(path, 'utf8')) as unknown,
  );
  const problems = errors.length > 0 ? errors : documentProblems(document);
  if (problems.length > 0) {
    throw new Error(`${path} has problems:\n  - ${problems.join('\n  - ')}`);
  }
  return document;
}
