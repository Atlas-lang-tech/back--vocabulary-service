import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module.js';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module.js';
import { DictionaryModule } from './dictionary/dictionary.module.js';
import { WordModule } from './word/word.module.js';
import { StudyModule } from './study/study.module.js';
import { PlanLimitModule } from './plan-limit/plan-limit.module.js';
import { validate } from './common/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    RedisModule,
    RabbitmqModule,
    PlanLimitModule,
    DictionaryModule,
    WordModule,
    StudyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
