import { ApiProperty } from '@nestjs/swagger';
import { Condition, ListingPlatform, ListingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class DimensionsDto {
  @ApiProperty({ required: false, example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  length?: number;

  @ApiProperty({ required: false, example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiProperty({ required: false, example: 'in' })
  @IsOptional()
  @IsString()
  unit?: string;
}

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
  @Type(() => Number)
  @IsNumber()
  askingPrice!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feesEstimate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency: string = 'USD';

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shippingPrice?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platformCredentialId?: string;

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

  @ApiProperty({
    required: false,
    description: 'Arbitrary platform override JSON',
  })
  @IsOptional()
  platformSettings?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightLbs?: number;

  @ApiProperty({ required: false, type: DimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}
