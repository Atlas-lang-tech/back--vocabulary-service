import { Module } from '@nestjs/common';
import { PlanLimitModule } from '../../plan-limit/plan-limit.module.js';
import { RabbitmqService } from './rabbitmq.service.js';

@Module({
  imports: [PlanLimitModule],
  providers: [RabbitmqService],
})
export class RabbitmqModule {}
