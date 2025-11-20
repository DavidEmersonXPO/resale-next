import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SalvationInvoiceItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;
}

export class SalvationInvoiceDto {
  @ApiProperty()
  @IsString()
  invoiceNumber!: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty()
  @IsNumber()
  total!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiProperty({ type: () => [SalvationInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalvationInvoiceItemDto)
  items!: SalvationInvoiceItemDto[];
}
