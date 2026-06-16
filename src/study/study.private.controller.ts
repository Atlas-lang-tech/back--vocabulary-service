import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { StudyService } from './study.service.js';
import { AnswerDto } from './dto/answer.dto.js';

@Controller('private/study')
export class StudyPrivateController {
  constructor(private readonly service: StudyService) {}

  @Get(':dictionaryId/session')
  getSession(@Param('dictionaryId', ParseIntPipe) dictionaryId: number) {
    return this.service.getDailySession(dictionaryId);
  }

  @Post('answer')
  answer(@Body() dto: AnswerDto) {
    return this.service.recordAnswer(dto);
  }
}
