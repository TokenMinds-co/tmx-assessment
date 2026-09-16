import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { MediaAsset, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_STORAGE, type FileStorage } from '../storage/file-storage';
import { detectMediaType, SUPPORTED_MEDIA_MESSAGE } from './media-type';

export const MEDIA_NOT_FOUND = 'That file doesn’t exist.';

export interface UploadInput {
  data: Buffer;
  originalName: string;
}

/** Uploaded files: the bytes in FILE_STORAGE, the details in `media_assets`. */
@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  /** Checks the file type from its bytes, stores it and records it. */
  async upload(
    input: UploadInput,
    uploadedById: string | null,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<MediaAsset> {
    const type = detectMediaType(input.data);
    if (!type) throw new BadRequestException(SUPPORTED_MEDIA_MESSAGE);

    const key = `media/${randomUUID()}.${type.extension}`;
    await this.storage.put(key, input.data);
    try {
      return await db.mediaAsset.create({
        data: {
          key,
          mimeType: type.mimeType,
          sizeBytes: input.data.length,
          originalName: cleanFileName(input.originalName, type.extension),
          uploadedById,
        },
      });
    } catch (error) {
      await this.storage.remove(key).catch(() => undefined);
      throw error;
    }
  }

  async findOrThrow(id: string): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(MEDIA_NOT_FOUND);
    return asset;
  }

  /** The file on disk, or a 404 when the record exists but the file is gone. */
  async localPathOrThrow(asset: MediaAsset): Promise<string> {
    const path = await this.storage.localPath(asset.key);
    if (!path) throw new NotFoundException(MEDIA_NOT_FOUND);
    return path;
  }

  /** Deletes the record, then the file. Questions using it lose their media. */
  async remove(id: string): Promise<void> {
    const asset = await this.findOrThrow(id);
    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.storage.remove(asset.key);
  }
}

/** The name without any folder, trimmed to a sensible length. */
function cleanFileName(name: string, extension: string): string {
  const cleaned = basename(name.replace(/\\/g, '/')).trim().slice(0, 200);
  return cleaned || `upload.${extension}`;
}
