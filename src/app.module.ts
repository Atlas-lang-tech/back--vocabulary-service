import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module.js';
import { DictionaryModule } from './dictionary/dictionary.module.js';
import { WordModule } from './word/word.module.js';
import { StudyModule } from './study/study.module.js';
import { validate } from './common/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    RedisModule,
    DictionaryModule,
    WordModule,
    StudyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
