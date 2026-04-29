import { OrderErrorCode } from '../../src/domain/order/order-error-code';
import { OrderItem } from '../../src/domain/order/order-item.model';
import { Order } from '../../src/domain/order/order.model';
import { OrderStatus } from '../../src/domain/order/order-status';
import { OrderRepositoryImpl } from '../../src/infrastructure/order/order.repository.impl';
import {
  anOrderDetailRow,
  anOrderRow,
} from '../support/builders/order.builder';
import {
  expectCoreExceptionAsync,
  expectNotNull,
} from '../support/expect-helpers';
import {
  startPrismaTestEnv,
  type PrismaTestEnv,
} from '../support/prisma-test-env';

describe('OrderRepositoryImpl 통합 테스트 (실제 MySQL)', () => {
  let testEnv: PrismaTestEnv;
  let orderRepository: OrderRepositoryImpl;

  beforeAll(async () => {
    testEnv = await startPrismaTestEnv();
    orderRepository = new OrderRepositoryImpl(testEnv.prisma);
  }, 60_000);

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.truncate();
  });

  describe('save (insert) — id=0 인 새 주문', () => {
    it('order 와 ordersDetail row 를 모두 영속화한다', async () => {
      // given - 항목 2개의 새 주문
      const items = [
        OrderItem.create({
          productId: 100,
          productName: 'X',
          quantity: 2,
          price: 5_000,
        }),
        OrderItem.create({
          productId: 200,
          productName: 'Y',
          quantity: 1,
          price: 3_000,
        }),
      ];
      const newOrder = Order.create({
        customerId: 1,
        orderNo: 'ORD-INT-1',
        items,
      });

      // when
      const savedOrder = await orderRepository.save(newOrder);

      // then - order id 부여 + 합계 검증
      expect(savedOrder.id).toBeGreaterThan(0);
      expect(savedOrder.totalPrice).toBe(13_000); // 10,000 + 3,000
      expect(savedOrder.orderItems).toHaveLength(2);

      // then - DB 에 order row 영속화
      const orderRow = await testEnv.prisma.order.findUnique({
        where: { id: savedOrder.id },
      });
      expectNotNull(orderRow);
      expect(orderRow.customer_id).toBe(1);
      expect(orderRow.order_no).toBe('ORD-INT-1');
      expect(orderRow.total_price).toBe(13_000);

      // then - ordersDetail 2건 영속화 (order_no 로 join 가능)
      const detailRows = await testEnv.prisma.ordersDetail.findMany({
        where: { order_no: 'ORD-INT-1' },
      });
      expect(detailRows).toHaveLength(2);
      expect(detailRows.map((d) => d.product_id).sort()).toEqual([100, 200]);
    });
  });

  describe('findById', () => {
    describe('성공 케이스', () => {
      it('order_no 로 ordersDetail 을 join 해 OrderItem 들을 가진 Order 를 반환한다', async () => {
        // given - DB 에 order + ordersDetail row 직접 삽입
        const orderRow = await testEnv.prisma.order.create({
          data: anOrderRow({
            customer_id: 1,
            order_no: 'ORD-FIND-1',
            total_price: 10_000,
            status: OrderStatus.CREATED,
          }),
        });
        await testEnv.prisma.ordersDetail.create({
          data: anOrderDetailRow({
            order_no: 'ORD-FIND-1',
            product_id: 100,
            unit_price: 5_000,
            qty: 2,
          }),
        });

        // when
        const foundOrder = await orderRepository.findById(orderRow.id);

        // then
        expectNotNull(foundOrder);
        expect(foundOrder.id).toBe(orderRow.id);
        expect(foundOrder.orderNo).toBe('ORD-FIND-1');
        expect(foundOrder.totalPrice).toBe(10_000);
        expect(foundOrder.orderItems).toHaveLength(1);
        expect(foundOrder.orderItems[0]?.productId).toBe(100);
        expect(foundOrder.orderItems[0]?.quantity).toBe(2);
      });
    });

    describe('실패 케이스', () => {
      it('존재하지 않는 ID 면 null 을 반환한다', async () => {
        // given
        const nonExistentId = 999_999;

        // when
        const result = await orderRepository.findById(nonExistentId);

        // then
        expect(result).toBeNull();
      });

      it('order_no 가 null 인 손상된 row 는 CORRUPTED_ROW 예외를 던진다', async () => {
        // given
        const corruptedRow = await testEnv.prisma.order.create({
          data: anOrderRow({ order_no: null }),
        });

        // when
        const action = (): Promise<unknown> =>
          orderRepository.findById(corruptedRow.id);

        // then
        await expectCoreExceptionAsync(action, OrderErrorCode.CORRUPTED_ROW);
      });
    });
  });
});
