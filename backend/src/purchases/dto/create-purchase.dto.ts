import { PurchaseSource, InventoryStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PurchaseItemDto } from './purchase-item.dto';

export class CreatePurchaseDto {
  @ApiProperty({ enum: PurchaseSource })
  @IsEnum(PurchaseSource)
  source!: PurchaseSource;

  @ApiProperty()
  @IsDateString()
  purchaseDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderNumber?: string;

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

  @ApiProperty({ enum: InventoryStatus, default: InventoryStatus.IN_STOCK })
  @IsEnum(InventoryStatus)
  status: InventoryStatus = InventoryStatus.IN_STOCK;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: () => [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
