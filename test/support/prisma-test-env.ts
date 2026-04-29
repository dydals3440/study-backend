import { execSync } from 'node:child_process';
import { ConfigService } from '@nestjs/config';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

/**
 * Integration / E2E 테스트용 MySQL 컨테이너 + PrismaService 라이프사이클.
 * `beforeAll` 에서 컨테이너를 띄우고, 빈 DB 에 schema 를 push 한 뒤
 * PrismaService 를 `$connect` 시킨다.
 */
export interface PrismaTestEnv {
  container: StartedMySqlContainer;
  prisma: PrismaService;
  /** 컨테이너 정지 + Prisma 연결 해제 */
  cleanup: () => Promise<void>;
  /** 모든 도메인 테이블의 row 삭제 (테스트 격리용) */
  truncate: () => Promise<void>;
}

export async function startPrismaTestEnv(): Promise<PrismaTestEnv> {
  const container = await new MySqlContainer('mysql:8.0').start();
  const databaseUrl = container.getConnectionUri();

  // 빈 컨테이너에 schema 를 동기화 — migration 파일 없이도 동작
  execSync('pnpm prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  const configService = new ConfigService({ DATABASE_URL: databaseUrl });
  const prisma = new PrismaService(configService);
  await prisma.$connect();

  return {
    container,
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
    truncate: async () => {
      // 도메인 4개 테이블 비우기 (FK 없는 스키마라 순서 무관)
      await prisma.ordersDetail.deleteMany();
      await prisma.order.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.product.deleteMany();
    },
  };
}
