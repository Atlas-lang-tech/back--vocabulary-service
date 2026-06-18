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
import { DictionaryService } from './dictionary.service.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@UseGuards(UserContextGuard)
@Controller('private/dictionaries')
export class DictionaryPrivateController {
  constructor(private readonly service: DictionaryService) {}

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateDictionaryDto) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateDictionaryDto,
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.remove(id, user.userId);
  }
}
