import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

/**
 * Applies the global prefix, interceptor, filter, validation pipe and CORS.
 * Shared by bootstrap() (src/main.ts) and the e2e tests so both exercise the
 * exact same runtime configuration (response envelope, `api/vocabulary` prefix,
 * error filter). Kept in its own module so importing it has no side effects.
 */
export function setupApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/vocabulary');
  app.enableShutdownHooks();

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: ['http://localhost:5173', 'https://example.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  return app;
}
