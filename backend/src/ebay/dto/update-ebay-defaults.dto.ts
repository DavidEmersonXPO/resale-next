import { IsOptional, IsString } from 'class-validator';

export class UpdateEbayDefaultsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentPolicyId?: string;

  @IsOptional()
  @IsString()
  fulfillmentPolicyId?: string;

  @IsOptional()
  @IsString()
  returnPolicyId?: string;
}
