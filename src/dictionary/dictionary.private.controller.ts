import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@Controller('private/dictionaries')
export class DictionaryPrivateController {
  constructor(private readonly service: DictionaryService) {}

  @Post()
  create(@Body() dto: CreateDictionaryDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictionaryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
  ) {
    return this.service.remove(id, userId);
  }
}
