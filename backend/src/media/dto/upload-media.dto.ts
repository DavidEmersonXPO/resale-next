import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadMediaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  altText?: string;
}
