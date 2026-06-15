import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module.js';
import { validate } from './common/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    RedisModule,
    // Register feature modules here, e.g. WordModule.
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
