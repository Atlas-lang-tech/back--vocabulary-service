import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWordDto {
  @IsInt()
  dictionaryId!: number;

  @IsString()
  @IsNotEmpty()
  word!: string;

  @IsString()
  @IsNotEmpty()
  translation!: string;

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
