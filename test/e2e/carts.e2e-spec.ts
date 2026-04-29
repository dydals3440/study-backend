import request from 'supertest';
import { aCartRow } from '../support/builders/cart.builder';
import { createTestApp, type TestApp } from '../support/nest-test-app';

describe('장바구니 E2E', () => {
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

  describe('POST /api/v1/carts', () => {
    describe('성공 케이스', () => {
      it('항목이 추가되고 ApiResponse 봉투 + DB row 가 모두 검증된다', async () => {
        // given
        const validBody = {
          customerId: 1,
          productId: 100,
          unitPrice: 5_000,
          quantity: 2,
        };

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/carts')
          .send(validBody)
          .expect(201);

        // then - 응답 봉투
        expect(response.body).toMatchObject({
          meta: { result: 'SUCCESS' },
          data: {
            customerId: 1,
            productId: 100,
            unitPrice: 5_000,
            quantity: 2,
          },
        });

        // then - DB side effect
        const persistedCarts = await testApp.prisma.cart.findMany({
          where: { customer_id: 1 },
        });
        expect(persistedCarts).toHaveLength(1);
        expect(persistedCarts[0]?.product_id).toBe(100);
      });
    });

    describe('실패 케이스', () => {
      it('수량이 0 이면 400 + cart.quantity.not-positive 코드 (도메인 검증)', async () => {
        // given - 수량 0 인 잘못된 본문
        const invalidQuantityBody = {
          customerId: 1,
          productId: 100,
          unitPrice: 5_000,
          quantity: 0,
        };

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/carts')
          .send(invalidQuantityBody)
          .expect(400);

        // then
        expect(response.body).toMatchObject({
          code: 'cart.quantity.not-positive',
        });

        // then - DB 에 영속화되지 않음
        const persistedCarts = await testApp.prisma.cart.findMany();
        expect(persistedCarts).toHaveLength(0);
      });
    });
  });

  describe('GET /api/v1/carts/:customerId', () => {
    it('해당 customer 의 항목만 반환되고 다른 customer 는 포함되지 않는다', async () => {
      // given - 두 고객의 장바구니
      const targetCustomerId = 1;
      const otherCustomerId = 2;
      await testApp.prisma.cart.createMany({
        data: [
          aCartRow({ customer_id: targetCustomerId, product_id: 10 }),
          aCartRow({ customer_id: targetCustomerId, product_id: 20 }),
          aCartRow({ customer_id: otherCustomerId, product_id: 30 }),
        ],
      });

      // when
      const response = await request(testApp.app.getHttpServer())
        .get(`/api/v1/carts/${targetCustomerId}`)
        .expect(200);

      // then
      expect(response.body.data).toHaveLength(2);
      const productIds = response.body.data.map(
        (item: { productId: number }) => item.productId,
      );
      expect(productIds.sort()).toEqual([10, 20]);
    });

    it('해당 customer 의 row 가 없으면 빈 배열을 반환한다 (200)', async () => {
      // given
      const customerWithoutCart = 999;

      // when
      const response = await request(testApp.app.getHttpServer())
        .get(`/api/v1/carts/${customerWithoutCart}`)
        .expect(200);

      // then
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/v1/carts/:customerId', () => {
    it('해당 customer 의 항목들이 모두 삭제되고 다른 customer 는 영향 없다', async () => {
      // given
      const targetCustomerId = 1;
      const otherCustomerId = 2;
      await testApp.prisma.cart.createMany({
        data: [
          aCartRow({ customer_id: targetCustomerId }),
          aCartRow({ customer_id: targetCustomerId }),
          aCartRow({ customer_id: otherCustomerId }),
        ],
      });

      // when
      await request(testApp.app.getHttpServer())
        .delete(`/api/v1/carts/${targetCustomerId}`)
        .expect(200);

      // then
      const remainingForTarget = await testApp.prisma.cart.findMany({
        where: { customer_id: targetCustomerId },
      });
      const remainingForOther = await testApp.prisma.cart.findMany({
        where: { customer_id: otherCustomerId },
      });
      expect(remainingForTarget).toHaveLength(0);
      expect(remainingForOther).toHaveLength(1);
    });
  });
});
