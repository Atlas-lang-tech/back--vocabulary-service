import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { StudyPrivateController } from './study.private.controller.js';
import { StudyService } from './study.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [StudyPrivateController],
  providers: [StudyService],
})
export class StudyModule {}
