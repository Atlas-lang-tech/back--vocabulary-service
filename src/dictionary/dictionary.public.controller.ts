import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DictionaryService } from './dictionary.service.js';

@Controller('public/dictionaries')
export class DictionaryPublicController {
  constructor(private readonly service: DictionaryService) {}

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
