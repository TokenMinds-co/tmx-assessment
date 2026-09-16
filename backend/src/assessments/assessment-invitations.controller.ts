import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/error-response.dto';
import { AssessmentInvitationsService } from './assessment-invitations.service';
import {
  CreateAssessmentInvitationDto,
  InvitationDetailDto,
  InvitationListDto,
  ListInvitationsQueryDto,
  ResendInvitationDto,
  SentInvitationDto,
} from './dto/invitation.dto';

/** Sending tests and reading results. Any staff member. See docs/assessments.md. */
@ApiTags('assessment invitations')
@ApiSession()
@ApiBadRequestResponse({ type: ErrorResponseDto })
@Controller('assessment-invitations')
export class AssessmentInvitationsController {
  constructor(private readonly invitations: AssessmentInvitationsService) {}

  @ApiOperation({
    summary: 'Send tests to a candidate',
    description:
      'Creates one link for all the tests, freezes each test as it is now, and emails the link. The answer includes the link, so staff can share it themselves; `emailSent` is false if the email failed.',
  })
  @ApiCreatedResponse({ type: SentInvitationDto })
  @ApiConflictResponse({
    description:
      'The candidate already has one of these tests in an open link.',
    type: ErrorResponseDto,
  })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentInvitationDto,
  ): Promise<SentInvitationDto> {
    return this.invitations.create(dto, user);
  }

  @ApiOperation({ summary: 'List sent links, newest first' })
  @ApiOkResponse({ type: InvitationListDto })
  @Get()
  list(@Query() query: ListInvitationsQueryDto): Promise<InvitationListDto> {
    return this.invitations.list(query);
  }

  @ApiOperation({ summary: 'A sent link with each test’s result' })
  @ApiOkResponse({ type: InvitationDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<InvitationDetailDto> {
    return this.invitations.detail(id);
  }

  @ApiOperation({
    summary: 'Email a new link',
    description:
      'The old link stops working. An expired link gets a new expiry.',
  })
  @ApiOkResponse({ type: SentInvitationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Revoked, or every test is finished.',
    type: ErrorResponseDto,
  })
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendInvitationDto,
  ): Promise<SentInvitationDto> {
    return this.invitations.resend(id, dto);
  }

  @ApiOperation({
    summary: 'Revoke a link',
    description: 'It stops working at once, even for a test in progress.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.invitations.revoke(id);
  }
}
