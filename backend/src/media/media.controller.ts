import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ErrorResponseDto } from '../common/error-response.dto';
import { UserRole } from '../generated/prisma/enums';
import { MediaResponseDto } from './dto/media-response.dto';
import { MAX_MEDIA_BYTES } from './media.constants';
import { SUPPORTED_MEDIA_MESSAGE } from './media-type';
import { MediaService } from './media.service';

/** Question audio and images. See docs/assessments.md. */
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @ApiOperation({
    summary: 'Upload a file (admins only)',
    description: `A multipart form with one \`file\` field, up to ${MAX_MEDIA_BYTES / 1024 / 1024} MB. ${SUPPORTED_MEDIA_MESSAGE} The type is read from the file itself.`,
  })
  @ApiSession()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: MediaResponseDto })
  @ApiBadRequestResponse({
    description: 'No file, or not a supported type.',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({ description: 'Bigger than 10 MB.' })
  @ApiForbiddenResponse({ description: 'Admins only.', type: ErrorResponseDto })
  @Roles(UserRole.ADMIN)
  @Post()
  // Multer keeps the upload in memory (its default), then the service stores it.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MEDIA_BYTES, files: 1 },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MediaResponseDto> {
    if (!file) throw new BadRequestException('Choose a file to upload.');
    const asset = await this.media.upload(
      { data: file.buffer, originalName: file.originalname },
      user.id,
    );
    return MediaResponseDto.from(asset);
  }

  /**
   * Public, so a candidate's browser can play question audio. Express's
   * sendFile answers Range requests, which browsers use to seek and replay.
   */
  @ApiOperation({
    summary: 'Download a file',
    description:
      'Public, so candidates can play question audio. Supports Range requests.',
  })
  @ApiOkResponse({ description: 'The file.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Public()
  @SkipThrottle()
  @Get(':id')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const asset = await this.media.findOrThrow(id);
    const path = await this.media.localPathOrThrow(asset);

    await new Promise<void>((resolve) => {
      res.sendFile(
        path,
        {
          headers: {
            'Content-Type': asset.mimeType,
            'Content-Disposition': 'inline',
            'X-Content-Type-Options': 'nosniff',
            // A file never changes: a replacement is uploaded under a new id.
            'Cache-Control': 'private, max-age=86400, immutable',
          },
        },
        (error) => {
          // The client may go away mid-download; there's no one to tell then.
          if (error && !res.headersSent) res.status(404).end();
          resolve();
        },
      );
    });
  }

  @ApiOperation({
    summary: 'Delete a file (admins only)',
    description: 'Questions that used it are left without media.',
  })
  @ApiSession()
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Admins only.', type: ErrorResponseDto })
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.media.remove(id);
  }
}
