import { OrderErrorCode } from './order-error-code';
import { OrderItem } from './order-item.model';
import { Order } from './order.model';
import { OrderStatus } from './order-status';
import {
  anOrder,
  anOrderItem,
} from '../../../test/support/builders/order.builder';

describe('Order 도메인 모델', () => {
  describe('create — 신규 주문 생성', () => {
    describe('성공 케이스', () => {
      it('단일 항목으로 주문을 생성하면 totalPrice 와 originalPrice 가 항목 합계로 설정된다', () => {
        // given - 단가 5,000원 × 2개 = 10,000원
        const singleItem = OrderItem.create({
          productId: 1,
          productName: 'X',
          quantity: 2,
          price: 5_000,
        });

        // when
        const newOrder = Order.create({
          customerId: 1,
          orderNo: 'ORD-1',
          items: [singleItem],
        });

        // then
        expect(newOrder.id).toBe(0);
        expect(newOrder.status).toBe(OrderStatus.CREATED);
        expect(newOrder.originalPrice).toBe(10_000);
        expect(newOrder.totalPrice).toBe(10_000);
        expect(newOrder.discountAmount).toBe(0);
        expect(newOrder.couponId).toBeNull();
        expect(newOrder.orderItems).toHaveLength(1);
      });

      it('다중 항목의 합계가 originalPrice 에 누적된다', () => {
        // given - 5,000원×2 + 3,000원×3 = 19,000원
        const items = [
          OrderItem.create({
            productId: 1,
            productName: 'A',
            quantity: 2,
            price: 5_000,
          }),
          OrderItem.create({
            productId: 2,
            productName: 'B',
            quantity: 3,
            price: 3_000,
          }),
        ];

        // when
        const orderWithMultipleItems = Order.create({
          customerId: 1,
          orderNo: 'ORD-2',
          items,
        });

        // then
        expect(orderWithMultipleItems.originalPrice).toBe(19_000);
        expect(orderWithMultipleItems.totalPrice).toBe(19_000);
        expect(orderWithMultipleItems.orderItems).toHaveLength(2);
      });
    });

    describe('실패 케이스', () => {
      it('항목 배열이 비어있으면 ITEMS_EMPTY 예외를 던진다', () => {
        // given - 빈 items
        const emptyItems: OrderItem[] = [];

        // when
        const createAction = (): Order =>
          Order.create({
            customerId: 1,
            orderNo: 'ORD-3',
            items: emptyItems,
          });

        // then
        expect(createAction).toThrow(
          expect.objectContaining({ errorCode: OrderErrorCode.ITEMS_EMPTY }),
        );
      });
    });
  });

  describe('addItem — 항목 추가 후 합계 갱신', () => {
    it('새 항목을 추가하면 orderItems 에 누적되고 totalPrice/originalPrice 가 증가한다', () => {
      // given - 항목 1개 (5,000원)인 주문
      const initialItem = OrderItem.create({
        productId: 1,
        productName: 'A',
        quantity: 1,
        price: 5_000,
      });
      const order = Order.create({
        customerId: 1,
        orderNo: 'ORD-4',
        items: [initialItem],
      });
      const additionalItem = OrderItem.create({
        productId: 2,
        productName: 'B',
        quantity: 2,
        price: 1_000,
      });

      // when - 2,000원짜리 항목 추가
      order.addItem(additionalItem);

      // then - 합계가 7,000원으로 증가
      expect(order.orderItems).toHaveLength(2);
      expect(order.originalPrice).toBe(7_000);
      expect(order.totalPrice).toBe(7_000);
    });
  });

  describe('applyDiscount — 할인 적용', () => {
    it('할인 금액과 쿠폰 ID 가 반영되며 totalPrice 가 (originalPrice - discount) 로 갱신된다', () => {
      // given - 원가 10,000원의 주문
      const order = anOrder()
        .withItem(
          anOrderItem({
            productId: 1,
            productName: 'X',
            quantity: 2,
            price: 5_000,
          }),
        )
        .build();

      // when - 2,000원 할인 (쿠폰 id=42)
      order.applyDiscount(2_000, 42);

      // then
      expect(order.discountAmount).toBe(2_000);
      expect(order.couponId).toBe(42);
      expect(order.originalPrice).toBe(10_000);
      expect(order.totalPrice).toBe(8_000);
    });

    it('할인이 원가를 초과하지 않는 한도에서 정상 계산된다 (할인 = 원가)', () => {
      // given - 원가 5,000원
      const order = anOrder()
        .withItem(
          anOrderItem({
            productId: 1,
            productName: 'X',
            quantity: 1,
            price: 5_000,
          }),
        )
        .build();

      // when - 5,000원 풀 할인
      order.applyDiscount(5_000, 1);

      // then - totalPrice 0
      expect(order.totalPrice).toBe(0);
    });
  });

  describe('cancel — 주문 취소', () => {
    it('status 가 CANCELLED 로 변경된다', () => {
      // given - CREATED 상태의 주문
      const order = anOrder()
        .withItem(anOrderItem())
        .withStatus(OrderStatus.CREATED)
        .build();

      // when
      order.cancel();

      // then
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
