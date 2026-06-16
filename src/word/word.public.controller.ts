import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WordService } from './word.service.js';

@Controller('public/words')
export class WordPublicController {
  constructor(private readonly service: WordService) {}

  @Get('dictionary/:dictionaryId')
  findByDictionary(@Param('dictionaryId', ParseIntPipe) dictionaryId: number) {
    return this.service.findByDictionary(dictionaryId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
