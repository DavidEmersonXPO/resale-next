import { ApiProperty } from '@nestjs/swagger';
import { Condition, ListingPlatform, ListingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ enum: ListingPlatform })
  @IsEnum(ListingPlatform)
  platform!: ListingPlatform;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  askingPrice!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  feesEstimate?: number;

  @ApiProperty({ enum: ListingStatus, default: ListingStatus.DRAFT })
  @IsEnum(ListingStatus)
  status: ListingStatus = ListingStatus.DRAFT;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  listedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @ApiProperty({ enum: Condition, default: Condition.UNKNOWN })
  @IsEnum(Condition)
  condition: Condition = Condition.UNKNOWN;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, description: 'Arbitrary platform override JSON' })
  @IsOptional()
  platformSettings?: Record<string, unknown>;
}
