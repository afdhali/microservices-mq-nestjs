import { NestFactory } from '@nestjs/core';
import { CatalogModule } from './catalog.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  process.title = 'catalog';
  const rmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  const queue = process.env.CATALOG_QUEUE ?? 'catalog_queue';

  const logger = new Logger('CatalogBootstrap');

  // create a microservice instance
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CatalogModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue,
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  app.enableShutdownHooks();
  await app.listen();

  logger.log(`Catalog RMQ Listening on Queue ${queue} via ${rmqUrl}`);
}
bootstrap().catch((err) => {
  console.error('catalog service is not works', err);
  process.exit(1);
});
