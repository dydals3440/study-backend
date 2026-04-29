import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { startPrismaTestEnv, type PrismaTestEnv } from './prisma-test-env';

/**
 * E2E 테스트용 — 풀 NestJS 앱을 실제 MySQL 컨테이너와 함께 부트.
 * `main.ts` 의 글로벌 설정 (prefix /api, URI 버저닝, ValidationPipe)을 동일하게 적용.
 * PrismaService 는 testcontainers 의 컨테이너로 override.
 */
export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
  truncate: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const env: PrismaTestEnv = await startPrismaTestEnv();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(env.prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();

  return {
    app,
    prisma: env.prisma,
    truncate: env.truncate,
    close: async () => {
      await app.close();
      await env.cleanup();
    },
  };
}
