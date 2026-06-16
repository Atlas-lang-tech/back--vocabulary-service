import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { DictionaryPrivateController } from './dictionary.private.controller.js';
import { DictionaryPublicController } from './dictionary.public.controller.js';
import { DictionaryService } from './dictionary.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [DictionaryPrivateController, DictionaryPublicController],
  providers: [DictionaryService],
})
export class DictionaryModule {}
