// Must stay first: the Sentry SDK instruments modules as they load.
import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfig } from './config/configuration';
import { LiveSocketAdapter } from './duels/live/live-socket.adapter';

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

  // The session's refresh token travels as an HttpOnly cookie
  // (src/auth/session-cookie.ts), so the auth routes need it parsed.
  app.use(cookieParser());

  // `credentials: true` is what lets the browser send that cookie at all:
  // without it a cross-origin request from learn-ls.com to api.learn-ls.com
  // carries no cookies, whatever the cookie itself says.
  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
  });
  // The live duel socket (docs/02-domain/duel.md §5) accepts the same origin.
  app.useWebSocketAdapter(
    new LiveSocketAdapter(
      app,
      configService.get('corsOrigin', { infer: true }),
    ),
  );

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
