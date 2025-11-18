import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class MediaService {
  private readonly storagePath: string;

  constructor(private readonly prisma: PrismaService, configService: ConfigService) {
    this.storagePath = configService.get<string>('media.storagePath') ?? './storage/media';
  }

  async saveUpload(file: Express.Multer.File, dto: UploadMediaDto) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!dto.purchaseItemId && !dto.listingId) {
      throw new BadRequestException('Specify purchaseItemId or listingId');
    }

    const absolutePath = join(process.cwd(), this.storagePath);
    await fs.mkdir(absolutePath, { recursive: true });

    const extensionFromName = extname(file.originalname);
    const filename = `${randomUUID()}${extensionFromName || ''}`;
    const filePath = join(absolutePath, filename);
    await fs.writeFile(filePath, file.buffer);

    return this.prisma.mediaAsset.create({
      data: {
        url: `/media/${filename}`,
        mimeType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          size: file.size,
          altText: dto.altText,
        },
        purchaseItemId: dto.purchaseItemId,
        listingId: dto.listingId,
      },
    });
  }
}
