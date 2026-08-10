import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  /*
   * Behind a platform that terminates TLS (Render, Fly, a load balancer), the
   * real client address arrives in `X-Forwarded-For` and `req.ip` is the
   * proxy. Left unset, the rate limiter would count every request against one
   * address and lock out all users at once, so this must match the actual
   * number of proxies in front of the app — trusting more hops than exist
   * lets a client spoof its own address through the header.
   */
  const trustProxy = configService.get('trustProxy', { infer: true });
  if (trustProxy > 0) {
    app.set('trust proxy', trustProxy);
  }

  // Sets the conservative security response headers (nosniff, frameguard,
  // HSTS, and similar). The CSP is left off: this process serves only JSON,
  // and the pages that need a policy are served by the frontend host.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  const port = configService.get('port', { infer: true });
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
