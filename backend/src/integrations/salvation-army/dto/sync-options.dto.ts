import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SalvationArmySyncOptionsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  live = false;
}
