import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  process.title = 'gateway';

  const logger = new Logger('GatewayBootstrap');
  const app = await NestFactory.create(GatewayModule);

  app.enableShutdownHooks();

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(process.env.port ?? 3000);

  logger.log(`Gateway is running at port : ${port}`);
}
bootstrap().catch((err) => {
  console.error('gateway service is not works', err);
  process.exit(1);
});
