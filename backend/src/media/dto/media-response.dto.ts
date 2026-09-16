import { ApiProperty } from '@nestjs/swagger';
import type { MediaAsset } from '../../generated/prisma/client';

/** Where a file is served, relative to the site. The frontend forwards /api. */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

export class MediaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: '/api/media/0199a0c2-0000-7000-8000-000000000000',
    description: 'Where the file is served, relative to the site.',
  })
  url!: string;

  @ApiProperty({ example: 'audio/mpeg' })
  mimeType!: string;

  @ApiProperty({ example: 'listening_Q13.mp3' })
  originalName!: string;

  @ApiProperty({ example: 21629 })
  sizeBytes!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(asset: MediaAsset): MediaResponseDto {
    return {
      id: asset.id,
      url: mediaUrl(asset.id),
      mimeType: asset.mimeType,
      originalName: asset.originalName,
      sizeBytes: asset.sizeBytes,
      createdAt: asset.createdAt,
    };
  }
}
