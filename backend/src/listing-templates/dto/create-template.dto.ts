import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateListingTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  vertical!: string;

  @ApiProperty({ description: 'Default data encoded as JSON', type: Object })
  defaultData!: Record<string, unknown>;
}
