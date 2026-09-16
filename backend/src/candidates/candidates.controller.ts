import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { ErrorResponseDto } from '../common/error-response.dto';
import { CandidatesService } from './candidates.service';
import {
  CandidateDto,
  CandidateListDto,
  CreateCandidateDto,
  ListCandidatesQueryDto,
} from './dto/candidate.dto';

/** Candidates, for the send dialog's search. Any staff member. */
@ApiTags('candidates')
@ApiSession()
@ApiBadRequestResponse({ type: ErrorResponseDto })
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @ApiOperation({ summary: 'Find candidates by name or email' })
  @ApiOkResponse({ type: CandidateListDto })
  @Get()
  async list(
    @Query() query: ListCandidatesQueryDto,
  ): Promise<CandidateListDto> {
    return {
      items: await this.candidates.search(query.search, query.limit ?? 20),
    };
  }

  @ApiOperation({ summary: 'Add a candidate' })
  @ApiCreatedResponse({ type: CandidateDto })
  @ApiConflictResponse({
    description: 'The email is taken.',
    type: ErrorResponseDto,
  })
  @Post()
  async create(@Body() dto: CreateCandidateDto): Promise<CandidateDto> {
    return CandidateDto.from(await this.candidates.create(dto));
  }
}
