import {
  BadRequestException,
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
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { sendAsFile, UTF8_BOM } from '../common/download';
import { ErrorResponseDto } from '../common/error-response.dto';
import { MAX_CSV_BYTES } from './assessments.constants';
import { AssessmentDetailDto } from './dto/assessment-response.dto';
import { QuestionImportResultDto } from './dto/question-import-result.dto';
import {
  CreateSectionDto,
  ImportQuestionsQueryDto,
  QuestionInputDto,
  ReorderDto,
  ReplaceBandsDto,
  UpdateSectionDto,
} from './dto/structure-input.dto';
import { QuestionsService } from './questions.service';

/**
 * Sections, questions and score bands inside a test. Every change answers
 * with the whole test. See docs/assessments.md.
 */
@ApiTags('assessments')
@ApiSession()
@ApiBadRequestResponse({
  description: 'The request failed validation, or the question isn’t complete.',
  type: ErrorResponseDto,
})
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller('assessments/:assessmentId')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @ApiOperation({ summary: 'Add a section (admins only)' })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @ApiConflictResponse({
    description: 'The name is taken.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Post('sections')
  createSection(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.createSection(assessmentId, dto);
  }

  @ApiOperation({ summary: 'Reorder sections (admins only)' })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Put('sections/order')
  reorderSections(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: ReorderDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.reorderSections(assessmentId, dto.ids);
  }

  @ApiOperation({ summary: 'Change a section (admins only)' })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @ApiConflictResponse({
    description: 'The name is taken.',
    type: ErrorResponseDto,
  })
  @AdminOnly()
  @Patch('sections/:sectionId')
  updateSection(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.updateSection(assessmentId, sectionId, dto);
  }

  @ApiOperation({
    summary: 'Delete a section (admins only)',
    description: 'Its questions stay, without a section.',
  })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Delete('sections/:sectionId')
  removeSection(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<AssessmentDetailDto> {
    return this.questions.removeSection(assessmentId, sectionId);
  }

  @ApiOperation({ summary: 'Add a question (admins only)' })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Post('questions')
  createQuestion(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: QuestionInputDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.createQuestion(assessmentId, dto);
  }

  @ApiOperation({ summary: 'Reorder questions (admins only)' })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Put('questions/order')
  reorderQuestions(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: ReorderDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.reorderQuestions(assessmentId, dto.ids);
  }

  @ApiOperation({
    summary: 'Import questions from CSV (admins only)',
    description:
      'A multipart form with one `file` field, up to 1 MB. Send `dryRun=true` first for a preview with every problem by row and column; nothing is saved then. A real import with problems answers 400.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: QuestionImportResultDto })
  @ApiPayloadTooLargeResponse({ description: 'Bigger than 1 MB.' })
  @AdminOnly()
  @Post('questions/import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_CSV_BYTES, files: 1 } }),
  )
  importQuestions(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Query() query: ImportQuestionsQueryDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<QuestionImportResultDto> {
    if (!file) throw new BadRequestException('Choose a CSV file to import.');
    return this.questions.importCsv(
      assessmentId,
      file.buffer,
      query.mode ?? 'append',
      query.dryRun ?? false,
    );
  }

  @ApiOperation({
    summary: 'Export questions as CSV',
    description:
      'The same columns the import reads. Middle labels on rating scales and employer wording on choice scales aren’t in CSV; use the JSON export to keep everything.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'A CSV file.' })
  @Get('questions/export.csv')
  async exportQuestions(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { filename, text } = await this.questions.exportCsv(assessmentId);
    sendAsFile(res, filename, 'text/csv; charset=utf-8');
    return `${UTF8_BOM}${text}`;
  }

  @ApiOperation({
    summary: 'Replace a question (admins only)',
    description:
      'Send the whole question. Options with an id keep it; options left out are deleted.',
  })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Put('questions/:questionId')
  updateQuestion(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: QuestionInputDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.updateQuestion(assessmentId, questionId, dto);
  }

  @ApiOperation({ summary: 'Copy a question (admins only)' })
  @ApiCreatedResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Post('questions/:questionId/duplicate')
  duplicateQuestion(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<AssessmentDetailDto> {
    return this.questions.duplicateQuestion(assessmentId, questionId);
  }

  @ApiOperation({ summary: 'Delete a question (admins only)' })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Delete('questions/:questionId')
  removeQuestion(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<AssessmentDetailDto> {
    return this.questions.removeQuestion(assessmentId, questionId);
  }

  @ApiOperation({
    summary: 'Replace the score bands (admins only)',
    description: 'Each band needs its own minimum, from 0 to 1.',
  })
  @ApiOkResponse({ type: AssessmentDetailDto })
  @AdminOnly()
  @Put('bands')
  replaceBands(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: ReplaceBandsDto,
  ): Promise<AssessmentDetailDto> {
    return this.questions.replaceBands(assessmentId, dto.bands);
  }
}
