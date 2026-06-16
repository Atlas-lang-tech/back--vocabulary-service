import { IsBoolean, IsInt } from 'class-validator';

export class AnswerDto {
  @IsInt()
  wordId!: number;

  // true => +1 point, false => -1 point (floored at 0).
  @IsBoolean()
  correct!: boolean;
}
