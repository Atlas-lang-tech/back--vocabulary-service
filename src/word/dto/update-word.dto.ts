import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateWordDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  word?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  translation?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transcription?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  example?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  lastStudiedAt?: string;
}
