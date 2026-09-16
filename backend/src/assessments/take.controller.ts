import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ErrorResponseDto } from '../common/error-response.dto';
import { CurrentInvitation } from './decorators/current-invitation.decorator';
import {
  AnswerDto,
  TakeAttemptDto,
  TakeOverviewDto,
  TakeSubmitDto,
} from './dto/take-response.dto';
import { InvitationTokenGuard } from './guards/invitation-token.guard';
import { TakeService } from './take.service';
import type { TakeInvitation } from './take.types';

const MINUTE = 60_000;

/**
 * The candidate side. No session: the token in the link is the access, checked
 * by InvitationTokenGuard. Rate limits are per IP and route. See
 * docs/assessments.md.
 */
@ApiTags('take')
@ApiParam({
  name: 'token',
  description: 'The token from the candidate’s link.',
})
@ApiNotFoundResponse({
  description: 'Unknown or revoked link.',
  type: ErrorResponseDto,
})
@ApiGoneResponse({
  description: 'The link has expired.',
  type: ErrorResponseDto,
})
@ApiTooManyRequestsResponse({ description: 'Rate limit hit for this IP.' })
@Public()
@UseGuards(InvitationTokenGuard)
@Controller('take/:token')
export class TakeController {
  constructor(private readonly take: TakeService) {}

  @ApiOperation({ summary: 'The tests in a link' })
  @ApiOkResponse({ type: TakeOverviewDto })
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  @Get()
  overview(
    @CurrentInvitation() invitation: TakeInvitation,
  ): Promise<TakeOverviewDto> {
    return this.take.overview(invitation);
  }

  @ApiOperation({
    summary: 'Start or resume a test',
    description:
      'The first call starts the clock and fixes the question order. Later calls return the same test with the saved answers.',
  })
  @ApiOkResponse({ type: TakeAttemptDto })
  @ApiConflictResponse({
    description: 'Already finished.',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @Post('attempts/:attemptId/start')
  @HttpCode(HttpStatus.OK)
  start(
    @CurrentInvitation() invitation: TakeInvitation,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<TakeAttemptDto> {
    return this.take.start(invitation, attemptId);
  }

  @ApiOperation({
    summary: 'Save an answer',
    description:
      'Answering again changes the answer. Refused after the time limit.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description: 'Not an option of this question.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Not started, already finished, or out of time.',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 300, ttl: MINUTE } })
  @Put('attempts/:attemptId/answers/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  answer(
    @CurrentInvitation() invitation: TakeInvitation,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: AnswerDto,
  ): Promise<void> {
    return this.take.answer(invitation, attemptId, questionId, dto.optionId);
  }

  @ApiOperation({
    summary: 'Submit a test',
    description:
      'Scores it on the server. The candidate never sees the score. Safe to repeat.',
  })
  @ApiOkResponse({ type: TakeSubmitDto })
  @ApiConflictResponse({
    description: 'Not started yet.',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @Post('attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentInvitation() invitation: TakeInvitation,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<TakeSubmitDto> {
    return this.take.submit(invitation, attemptId);
  }
}
