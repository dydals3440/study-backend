import request from 'supertest';
import { aProductRow } from '../support/builders/product.builder';
import { createTestApp, type TestApp } from '../support/nest-test-app';

describe('상품 E2E (GET /api/v1/products/:id)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await testApp.truncate();
  });

  describe('GET /api/v1/products/:id', () => {
    describe('성공 케이스', () => {
      it('존재하는 상품을 조회하면 200 + ApiResponse 봉투에 상품 데이터가 담겨있다', async () => {
        // given - DB 에 상품 row 1건
        const productInDb = await testApp.prisma.product.create({
          data: aProductRow({ price: 5_000, qty: 10 }),
        });

        // when
        const response = await request(testApp.app.getHttpServer())
          .get(`/api/v1/products/${productInDb.id}`)
          .expect(200);

        // then
        expect(response.body).toMatchObject({
          meta: { result: 'SUCCESS' },
          data: {
            id: productInDb.id,
            price: 5_000,
            stock: 10,
          },
        });
      });
    });

    describe('실패 케이스', () => {
      it('존재하지 않는 ID 면 404 + product.not-found 코드를 반환한다', async () => {
        // given - 어떤 row 도 없음
        const nonExistentProductId = 999_999;

        // when
        const response = await request(testApp.app.getHttpServer())
          .get(`/api/v1/products/${nonExistentProductId}`)
          .expect(404);

        // then
        expect(response.body).toMatchObject({ code: 'product.not-found' });
      });

      it('숫자가 아닌 ID 면 400 (ParseIntPipe 실패)', async () => {
        // given - 잘못된 path 파라미터
        const invalidProductId = 'not-a-number';

        // when & then
        await request(testApp.app.getHttpServer())
          .get(`/api/v1/products/${invalidProductId}`)
          .expect(400);
      });
    });
  });
});
