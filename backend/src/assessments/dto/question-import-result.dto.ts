import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../../generated/prisma/enums';
import { AssessmentDetailDto } from './assessment-response.dto';

export class CsvIssueDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The spreadsheet row; the header is row 1.',
  })
  row!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'correct' })
  column!: string | null;

  @ApiProperty({
    example: '"E" doesn’t match an option. Use a letter from A to C.',
  })
  message!: string;
}

export class CsvPreviewRowDto {
  @ApiProperty()
  row!: number;

  @ApiProperty({ type: String, nullable: true })
  ref!: string | null;

  @ApiProperty({ type: String, nullable: true })
  section!: string | null;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type!: QuestionType;

  @ApiProperty()
  stem!: string;

  @ApiProperty()
  optionCount!: number;

  @ApiProperty({ type: String, nullable: true, example: 'B' })
  correctLabel!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'listening_Q13.mp3' })
  media!: string | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description:
      'Whether an uploaded file matches the media name. Null without media.',
  })
  mediaFound!: boolean | null;
}

export class QuestionImportResultDto {
  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty({ enum: ['append', 'replace'] })
  mode!: 'append' | 'replace';

  @ApiProperty({ description: 'Question rows read from the file.' })
  rowCount!: number;

  @ApiProperty({ description: 'Questions saved. Zero on a dry run.' })
  importedCount!: number;

  @ApiProperty({ type: [String], description: 'Sections the import creates.' })
  newSections!: string[];

  @ApiProperty({ type: [CsvIssueDto] })
  errors!: CsvIssueDto[];

  @ApiProperty({ type: [CsvIssueDto] })
  warnings!: CsvIssueDto[];

  @ApiProperty({ type: [CsvPreviewRowDto] })
  preview!: CsvPreviewRowDto[];

  @ApiPropertyOptional({
    type: AssessmentDetailDto,
    description: 'The test after the import. Only when questions were saved.',
  })
  assessment?: AssessmentDetailDto;
}
