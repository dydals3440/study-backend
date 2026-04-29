import { OrderErrorCode } from './order-error-code';
import { OrderItem } from './order-item.model';

describe('OrderItem 도메인 모델', () => {
  describe('create — 신규 주문 항목 생성', () => {
    describe('성공 케이스', () => {
      it('유효한 입력이면 주문 항목이 생성되고 id 는 0 (미저장 상태) 이다', () => {
        // given - 유효한 입력
        const validProps = {
          productId: 100,
          productName: '상품A',
          quantity: 3,
          price: 5_000,
        };

        // when
        const newOrderItem = OrderItem.create(validProps);

        // then - 모든 필드가 입력값과 일치, id 는 0
        expect(newOrderItem.id).toBe(0);
        expect(newOrderItem.productId).toBe(100);
        expect(newOrderItem.productName).toBe('상품A');
        expect(newOrderItem.quantity).toBe(3);
        expect(newOrderItem.price).toBe(5_000);
      });

      it('가격이 0 이어도 (무료 상품) 생성된다', () => {
        // given - 가격 0 (무료 사은품 시나리오)
        const freeItemProps = {
          productId: 1,
          productName: '사은품',
          quantity: 1,
          price: 0,
        };

        // when
        const freeItem = OrderItem.create(freeItemProps);

        // then
        expect(freeItem.price).toBe(0);
      });
    });

    describe('실패 케이스', () => {
      it.each([0, -1, -10])(
        '수량이 %i 처럼 1 미만이면 QUANTITY_NOT_POSITIVE 예외를 던진다',
        (invalidQuantity) => {
          // given
          const propsWithInvalidQuantity = {
            productId: 1,
            productName: 'X',
            quantity: invalidQuantity,
            price: 1_000,
          };

          // when
          const createAction = (): OrderItem =>
            OrderItem.create(propsWithInvalidQuantity);

          // then
          expect(createAction).toThrow(
            expect.objectContaining({
              errorCode: OrderErrorCode.QUANTITY_NOT_POSITIVE,
            }),
          );
        },
      );

      it.each([-1, -1_000])(
        '가격이 %i 처럼 음수이면 PRICE_NEGATIVE 예외를 던진다',
        (negativePrice) => {
          // given
          const propsWithNegativePrice = {
            productId: 1,
            productName: 'X',
            quantity: 1,
            price: negativePrice,
          };

          // when
          const createAction = (): OrderItem =>
            OrderItem.create(propsWithNegativePrice);

          // then
          expect(createAction).toThrow(
            expect.objectContaining({
              errorCode: OrderErrorCode.PRICE_NEGATIVE,
            }),
          );
        },
      );
    });
  });

  describe('totalPrice — 항목 총액 계산', () => {
    it('가격과 수량을 곱한 값을 반환한다', () => {
      // given - 단가 1,500원 × 4개
      const orderItem = OrderItem.create({
        productId: 1,
        productName: 'X',
        quantity: 4,
        price: 1_500,
      });

      // when
      const total = orderItem.totalPrice();

      // then
      expect(total).toBe(6_000);
    });

    it('가격이 0 이면 총액도 0 이다', () => {
      // given
      const freeItem = OrderItem.create({
        productId: 1,
        productName: 'X',
        quantity: 5,
        price: 0,
      });

      // when
      const total = freeItem.totalPrice();

      // then
      expect(total).toBe(0);
    });
  });
});
