import { Module } from '@nestjs/common';
import { PlanLimitModule } from '../plan-limit/plan-limit.module.js';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { WordPrivateController } from './word.private.controller.js';
import { WordPublicController } from './word.public.controller.js';
import { WordService } from './word.service.js';

@Module({
  imports: [PrismaModule, PlanLimitModule],
  controllers: [WordPrivateController, WordPublicController],
  providers: [WordService],
})
export class WordModule {}
