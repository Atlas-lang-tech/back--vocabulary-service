import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDictionaryDto {
  // userId of the requester — compared against the dictionary owner to authorize the edit.
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;
}
