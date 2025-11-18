import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GoodwillManifestItemDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsNumber()
  unitCost!: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  quantity = 1;
}

export class GoodwillManifestDto {
  @ApiProperty()
  @IsString()
  manifestId!: string;

  @ApiProperty()
  @IsDateString()
  purchaseDate!: string;

  @ApiProperty()
  @IsNumber()
  totalCost!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiProperty({ type: () => [GoodwillManifestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodwillManifestItemDto)
  items!: GoodwillManifestItemDto[];
}
