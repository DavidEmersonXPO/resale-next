import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateListingTemplateDto } from './dto/create-template.dto';

@Injectable()
export class ListingTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateListingTemplateDto) {
    return this.prisma.listingTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        vertical: dto.vertical,
        defaultData: dto.defaultData as Prisma.InputJsonValue,
      },
    });
  }

  findAll() {
    return this.prisma.listingTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.listingTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }
}
