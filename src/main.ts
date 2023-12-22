import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as formidable from 'express-formidable';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const configService = app.get(ConfigService);

  const port = configService.get<string>('PORT');
  app.setGlobalPrefix('api/v1');

  // app.use(formidable());

  // port
  await app.listen(port, () => logger.log(`App running on Port: ${port}`));
}
bootstrap();
