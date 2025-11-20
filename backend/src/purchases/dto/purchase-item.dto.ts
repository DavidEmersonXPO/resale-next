import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InventoryStatus } from '@prisma/client';

export class PurchaseItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity = 1;

  @ApiProperty({ description: 'Unit cost for a single item' })
  @IsNumber()
  @IsPositive()
  unitCost!: number;

  @ApiProperty({ enum: InventoryStatus, default: InventoryStatus.IN_STOCK })
  @IsEnum(InventoryStatus)
  inventoryStatus: InventoryStatus = InventoryStatus.IN_STOCK;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;
}
