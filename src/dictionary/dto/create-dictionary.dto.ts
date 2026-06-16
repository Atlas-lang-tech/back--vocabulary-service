import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateDictionaryDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;
}
