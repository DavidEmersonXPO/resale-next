import { ApiProperty } from '@nestjs/swagger';
import { ListingPlatform } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class PublishListingDto {
  @ApiProperty({ required: false, type: [String], enum: ListingPlatform })
  @IsOptional()
  @IsEnum(ListingPlatform, { each: true })
  platforms?: ListingPlatform[];
}
