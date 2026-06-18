import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type UserContext,
} from '../common/auth/current-user.decorator.js';
import { UserContextGuard } from '../common/auth/user-context.guard.js';
import { WordService } from './word.service.js';
import { CreateWordDto } from './dto/create-word.dto.js';
import { UpdateWordDto } from './dto/update-word.dto.js';

@UseGuards(UserContextGuard)
@Controller('private/words')
export class WordPrivateController {
  constructor(private readonly service: WordService) {}

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateWordDto) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWordDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
