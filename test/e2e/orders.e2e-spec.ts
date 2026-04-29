import request from 'supertest';
import { aProductRow } from '../support/builders/product.builder';
import { buildCreateOrderRequest } from '../support/builders/order.builder';
import { createTestApp, type TestApp } from '../support/nest-test-app';

describe('주문 E2E', () => {
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

  describe('POST /api/v1/orders', () => {
    describe('성공 케이스', () => {
      it('주문이 생성되고 상품 재고가 차감되며 주문 상세가 영속화된다', async () => {
        // given - DB 에 재고 5개 짜리 상품
        const productInDb = await testApp.prisma.product.create({
          data: aProductRow({ price: 10_000, qty: 5 }),
        });
        const validBody = buildCreateOrderRequest({
          customerId: 1,
          items: [{ productId: productInDb.id, quantity: 2 }],
        });

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(validBody)
          .expect(201);

        // then - HTTP 응답
        expect(response.body).toMatchObject({
          meta: { result: 'SUCCESS' },
          data: {
            customerId: 1,
            status: 'CREATED',
            totalPrice: 20_000,
            orderItems: [
              { productId: productInDb.id, quantity: 2, price: 10_000 },
            ],
          },
        });

        // then - DB side effect: 재고 차감
        const updatedProductRow = await testApp.prisma.product.findUnique({
          where: { id: productInDb.id },
        });
        expect(updatedProductRow?.qty).toBe(3);

        // then - DB side effect: 주문 + 주문 상세 영속화
        const allOrders = await testApp.prisma.order.findMany();
        const allOrderDetails = await testApp.prisma.ordersDetail.findMany();
        expect(allOrders).toHaveLength(1);
        expect(allOrderDetails).toHaveLength(1);
        expect(allOrderDetails[0]?.product_id).toBe(productInDb.id);
        expect(allOrderDetails[0]?.qty).toBe(2);
      });
    });

    describe('실패 케이스', () => {
      it('재고 부족이면 409 + product.not-enough-stock 코드, 트랜잭션 롤백', async () => {
        // given - 재고 1개 짜리 상품
        const lowStockProduct = await testApp.prisma.product.create({
          data: aProductRow({ qty: 1 }),
        });
        const stockBeforeRequest = lowStockProduct.qty;
        const overOrderBody = buildCreateOrderRequest({
          customerId: 1,
          items: [{ productId: lowStockProduct.id, quantity: 5 }],
        });

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(overOrderBody)
          .expect(409);

        // then - 응답 에러 코드
        expect(response.body).toMatchObject({
          code: 'product.not-enough-stock',
        });

        // then - DB 상태가 시도 전과 동일
        const productAfterFailure = await testApp.prisma.product.findUnique({
          where: { id: lowStockProduct.id },
        });
        expect(productAfterFailure?.qty).toBe(stockBeforeRequest);

        // then - 주문이 생성되지 않음
        const allOrders = await testApp.prisma.order.findMany();
        const allOrderDetails = await testApp.prisma.ordersDetail.findMany();
        expect(allOrders).toHaveLength(0);
        expect(allOrderDetails).toHaveLength(0);
      });

      it('존재하지 않는 productId 면 404 + order.not-found, 영속화 없음', async () => {
        // given - 어떤 상품도 없음
        const nonExistentProductId = 999_999;
        const bodyWithMissingProduct = buildCreateOrderRequest({
          customerId: 1,
          items: [{ productId: nonExistentProductId, quantity: 1 }],
        });

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(bodyWithMissingProduct)
          .expect(404);

        // then
        expect(response.body).toMatchObject({ code: 'order.not-found' });
        const allOrders = await testApp.prisma.order.findMany();
        expect(allOrders).toHaveLength(0);
      });

      it('다중 항목 중 두 번째에서 재고 부족 시 첫 번째도 롤백된다 (트랜잭션 원자성)', async () => {
        // given - 첫 상품은 재고 풍부, 두 번째 상품은 재고 부족
        const wellStockedProduct = await testApp.prisma.product.create({
          data: aProductRow({ qty: 100 }),
        });
        const lowStockProduct = await testApp.prisma.product.create({
          data: aProductRow({ qty: 1 }),
        });
        const bodyWithMixedStock = buildCreateOrderRequest({
          customerId: 1,
          items: [
            { productId: wellStockedProduct.id, quantity: 2 }, // OK
            { productId: lowStockProduct.id, quantity: 5 }, // 부족
          ],
        });

        // when
        await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(bodyWithMixedStock)
          .expect(409);

        // then - 두 상품 모두 재고 변동 없음
        const wellStockedAfter = await testApp.prisma.product.findUnique({
          where: { id: wellStockedProduct.id },
        });
        const lowStockAfter = await testApp.prisma.product.findUnique({
          where: { id: lowStockProduct.id },
        });
        expect(wellStockedAfter?.qty).toBe(100);
        expect(lowStockAfter?.qty).toBe(1);

        // then - 주문도 영속화되지 않음
        const allOrders = await testApp.prisma.order.findMany();
        expect(allOrders).toHaveLength(0);
      });

      it('customerId 가 누락된 본문은 400 (ValidationPipe)', async () => {
        // given - customerId 빠진 본문
        const invalidBody = { items: [{ productId: 1, quantity: 1 }] };

        // when & then
        await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(invalidBody)
          .expect(400);
      });
    });
  });

  describe('GET /api/v1/orders/:orderId', () => {
    describe('성공 케이스', () => {
      it('생성한 주문을 조회하면 200 + 동일 데이터 + 주문 상세 포함', async () => {
        // given - POST 로 주문 1건 생성
        const productInDb = await testApp.prisma.product.create({
          data: aProductRow({ price: 5_000, qty: 10 }),
        });
        const createResponse = await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(
            buildCreateOrderRequest({
              customerId: 1,
              items: [{ productId: productInDb.id, quantity: 2 }],
            }),
          )
          .expect(201);
        const createdOrderId = createResponse.body.data.id as number;

        // when
        const response = await request(testApp.app.getHttpServer())
          .get(`/api/v1/orders/${createdOrderId}`)
          .expect(200);

        // then
        expect(response.body.data).toMatchObject({
          id: createdOrderId,
          customerId: 1,
          totalPrice: 10_000,
          status: 'CREATED',
        });
        expect(response.body.data.orderItems).toHaveLength(1);
      });
    });

    describe('실패 케이스', () => {
      it('존재하지 않는 ID 면 404 + order.not-found 를 반환한다', async () => {
        // given
        const nonExistentOrderId = 999_999;

        // when
        const response = await request(testApp.app.getHttpServer())
          .get(`/api/v1/orders/${nonExistentOrderId}`)
          .expect(404);

        // then
        expect(response.body).toMatchObject({ code: 'order.not-found' });
      });
    });
  });
});
