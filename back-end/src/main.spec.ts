import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('bootstrap', () => {
  const app = {
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
  });

  it('creates the app with CORS, the validation pipe and port 3333', async () => {
    const { bootstrap } = await import('./main');

    await expect(bootstrap()).resolves.toBe(app);

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
    expect(app.enableCors).toHaveBeenCalled();
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(app.listen).toHaveBeenCalledWith(3333);
  });

  it('propagates startup failures', async () => {
    const { bootstrap } = await import('./main');
    (NestFactory.create as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(bootstrap()).rejects.toThrow('boom');
  });
});
