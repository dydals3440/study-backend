import { Cart } from './cart.model';
import { CartErrorCode } from './cart-error-code';

describe('Cart 도메인 모델', () => {
  describe('create — 장바구니 항목 생성', () => {
    describe('성공 케이스', () => {
      it('유효한 입력이면 장바구니 항목이 생성되고 id 는 0 이다', () => {
        // given - 유효한 입력
        const validProps = {
          customerId: 1,
          productId: 100,
          unitPrice: 8_000,
          quantity: 2,
        };

        // when
        const newCart = Cart.create(validProps);

        // then
        expect(newCart.id).toBe(0);
        expect(newCart.customerId).toBe(1);
        expect(newCart.productId).toBe(100);
        expect(newCart.unitPrice).toBe(8_000);
        expect(newCart.quantity).toBe(2);
      });

      it('단가가 0 이어도 (무료 상품) 생성된다', () => {
        // given
        const freeItemProps = {
          customerId: 1,
          productId: 100,
          unitPrice: 0,
          quantity: 1,
        };

        // when
        const freeCart = Cart.create(freeItemProps);

        // then
        expect(freeCart.unitPrice).toBe(0);
      });
    });

    describe('실패 케이스', () => {
      it.each([0, -1, -10])(
        '수량이 %i 처럼 1 미만이면 QUANTITY_NOT_POSITIVE 예외를 던진다',
        (invalidQuantity) => {
          // given
          const propsWithInvalidQuantity = {
            customerId: 1,
            productId: 100,
            unitPrice: 1_000,
            quantity: invalidQuantity,
          };

          // when
          const createAction = (): Cart =>
            Cart.create(propsWithInvalidQuantity);

          // then
          expect(createAction).toThrow(
            expect.objectContaining({
              errorCode: CartErrorCode.QUANTITY_NOT_POSITIVE,
            }),
          );
        },
      );

      it.each([-1, -100, -1_000])(
        '단가가 %i 처럼 음수이면 PRICE_NEGATIVE 예외를 던진다',
        (negativePrice) => {
          // given
          const propsWithNegativePrice = {
            customerId: 1,
            productId: 100,
            unitPrice: negativePrice,
            quantity: 1,
          };

          // when
          const createAction = (): Cart => Cart.create(propsWithNegativePrice);

          // then
          expect(createAction).toThrow(
            expect.objectContaining({
              errorCode: CartErrorCode.PRICE_NEGATIVE,
            }),
          );
        },
      );
    });
  });
});
