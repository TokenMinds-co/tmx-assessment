import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readSeedFile } from '../assessment-seed.service';

const SEED = join(__dirname, '../../../seed');

// The prefilled tests, converted from the workbooks in the repo's assessment/ folder.
const EXPECTED = {
  'attention-to-detail': { questions: 15, minutes: 12, media: 0 },
  communication: { questions: 15, minutes: 8, media: 2 },
  'critical-thinking': { questions: 16, minutes: 12, media: 0 },
  'english-b1': { questions: 16, minutes: 10, media: 4 },
  motivation: { questions: 20, minutes: 15, media: 0 },
};

describe('seed assessments', () => {
  const files = readdirSync(join(SEED, 'assessments')).filter((f) =>
    f.endsWith('.json'),
  );

  it('has one file per prefilled test', () => {
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
  });

  it.each(Object.entries(EXPECTED))(
    '%s is valid and matches its workbook',
    async (slug, expected) => {
      const document = await readSeedFile(
        join(SEED, 'assessments', `${slug}.json`),
      );
      const media = document.questions.flatMap((q) => q.media?.file ?? []);

      expect(document.slug).toBe(slug);
      expect(document.questions).toHaveLength(expected.questions);
      expect(document.durationMinutes).toBe(expected.minutes);
      expect(media).toHaveLength(expected.media);
      for (const file of media)
        expect(existsSync(join(SEED, 'media', file))).toBe(true);
    },
  );
});
