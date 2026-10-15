import { createApp } from './app';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  const app = await createApp();
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
