import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDictionaryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;
}
