import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { sendAsFile, UTF8_BOM } from '../common/download';
import { ErrorResponseDto } from '../common/error-response.dto';
import { ScoringMethod } from '../generated/prisma/enums';
import { AssessmentsService } from './assessments.service';
import { CanonicalAssessmentDto } from './canonical/canonical.dto';
import { questionCsvTemplate } from './canonical/csv-questions';
import {
  CreateAssessmentDto,
  CsvTemplateQueryDto,
  ListAssessmentsQueryDto,
  UpdateAssessmentDto,
} from './dto/assessment-input.dto';
import {
  AssessmentDetailDto,
  AssessmentListDto,
} from './dto/assessment-response.dto';
import {
  AssessmentPreviewDto,
  PreviewScoreInputDto,
  ScoreResultDto,
} from './dto/take-response.dto';

/** The test library. Staff read and preview; admins change. See docs/assessments.md. */
@ApiTags('assessments')
@ApiSession()
@ApiBadRequestResponse({
  description:
    'The request failed validation, or the change would break the test.',
  type: ErrorResponseDto,
})
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @ApiOperation({ summary: 'List tests' })
  @ApiOkResponse({ type: AssessmentListDto })
  @Get()
  async list(
    @Query() query: ListAssessmentsQueryDto,
  ): Promise<AssessmentListDto> {
    return { items: await this.assessments.list(query.status) };
  }

  @ApiOperation({
    summary: 'Create a test (admins only)',
    description: 'It starts as a draft with four default score bands.',
  })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @ApiConflictResponse({
    description: 'The slug is taken.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentDto,
  ): Promise<AssessmentDetailDto> {
    return this.assessments.create(dto, user.id);
  }

  @ApiOperation({
    summary: 'Import a test from JSON (admins only)',
    description:
      'The canonical format that the export endpoint returns. The test starts as a draft. Up to 100 KB.',
  })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @ApiConflictResponse({
    description: 'The slug is taken.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Post('import')
  importTest(
    @CurrentUser() user: AuthUser,
    @Body() dto: CanonicalAssessmentDto,
  ): Promise<AssessmentDetailDto> {
    return this.assessments.importDocument(dto, user.id);
  }

  @ApiOperation({
    summary: 'Download the question CSV template',
    description:
      'The header row and example rows for the chosen scoring method.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'A CSV file.' })
  @Get('csv-template')
  csvTemplate(
    @Query() query: CsvTemplateQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): string {
    const method = query.scoringMethod ?? ScoringMethod.CORRECT_ANSWER;
    sendAsFile(res, 'questions-template.csv', 'text/csv; charset=utf-8');
    return `${UTF8_BOM}${questionCsvTemplate(method)}`;
  }

  @ApiOperation({ summary: 'A test with its questions and answer keys' })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AssessmentDetailDto> {
    return this.assessments.detail(id);
  }

  @ApiOperation({
    summary: 'Change a test’s settings (admins only)',
    description:
      'Publishing checks the test and answers 400 with a list of what to fix. Candidates already sent the test keep their version.',
  })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'The slug is taken.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ): Promise<AssessmentDetailDto> {
    return this.assessments.update(id, dto);
  }

  @ApiOperation({
    summary: 'Delete a test (admins only)',
    description: 'Only tests that were never sent. Archive the others.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'The test was sent.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.assessments.remove(id);
  }

  @ApiOperation({ summary: 'Copy a test as a new draft (admins only)' })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @AdminOnly()
  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentDetailDto> {
    return this.assessments.duplicate(id, user.id);
  }

  @ApiOperation({
    summary: 'Export a test as JSON',
    description: 'The canonical format, which the import endpoint reads back.',
  })
  @ApiOkResponse({ type: CanonicalAssessmentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id/export')
  async exportTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CanonicalAssessmentDto> {
    const document = await this.assessments.exportDocument(id);
    sendAsFile(res, `${document.slug}.json`);
    return document;
  }

  @ApiOperation({
    summary: 'Preview a test as a candidate sees it',
    description:
      'Freshly shuffled, with the answer key. Works on drafts. Nothing is saved.',
  })
  @ApiOkResponse({ type: AssessmentPreviewDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id/preview')
  preview(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentPreviewDto> {
    return this.assessments.preview(id);
  }

  @ApiOperation({
    summary: 'Score a preview',
    description:
      'What these answers would score, with bands and flags. Nothing is saved.',
  })
  @ApiOkResponse({ type: ScoreResultDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/preview/score')
  @HttpCode(HttpStatus.OK)
  previewScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewScoreInputDto,
  ): Promise<ScoreResultDto> {
    return this.assessments.previewScore(id, dto.answers);
  }
}
