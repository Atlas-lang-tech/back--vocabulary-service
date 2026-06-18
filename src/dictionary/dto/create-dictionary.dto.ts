import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDictionaryDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;
}
