import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const port = process.env.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });

  await app.listen(port);
}
bootstrap().then(() => {
  console.log('App is running on %s port', port);
});
