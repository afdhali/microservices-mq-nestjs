import { NestFactory } from '@nestjs/core';
import { MediaModule } from './media.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  process.title = 'media';
  const rmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  const queue = process.env.MEDIA_QUEUE ?? 'media_queue';

  const logger = new Logger('MediaBootstrap');

  // create a microservice instance
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    MediaModule,
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

  logger.log(`Media RMQ Listening on Queue ${queue} via ${rmqUrl}`);
}
bootstrap().catch((err) => {
  console.error('media service is not works', err);
  process.exit(1);
});
