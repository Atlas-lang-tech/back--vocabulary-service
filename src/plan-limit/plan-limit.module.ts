import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { PlanLimitService } from './plan-limit.service.js';

@Module({
  imports: [PrismaModule],
  providers: [PlanLimitService],
  exports: [PlanLimitService],
})
export class PlanLimitModule {}
