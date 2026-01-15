import { NestFactory } from '@nestjs/core';
import { SearchModule } from './search.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  process.title = 'search';
  const rmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  const queue = process.env.SEARCH_QUEUE ?? 'search_queue';

  const logger = new Logger('SearchBootstrap');

  // create a microservice instance
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SearchModule,
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

  logger.log(`Search RMQ Listening on Queue ${queue} via ${rmqUrl}`);
}
bootstrap().catch((err) => {
  console.error('search service is not works', err);
  process.exit(1);
});
