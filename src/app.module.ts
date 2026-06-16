import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module.js';
import { DictionaryModule } from './dictionary/dictionary.module.js';
import { validate } from './common/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    RedisModule,
    DictionaryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
