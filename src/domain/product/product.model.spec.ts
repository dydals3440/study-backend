import { CoreException } from '../../support/error/core-exception';
import { ProductErrorCode } from './product-error-code';
import { aProduct } from '../../../test/support/builders/product.builder';

describe('Product 도메인 모델', () => {
  describe('decreaseStock — 재고 차감', () => {
    describe('성공 케이스', () => {
      it('재고가 충분하면 요청 수량만큼 차감된다', () => {
        // given - 재고 10개를 가진 상품
        const inStockProduct = aProduct({ stock: 10 });

        // when - 3개를 차감
        inStockProduct.decreaseStock(3);

        // then - 재고가 7로 감소
        expect(inStockProduct.stock).toBe(7);
      });

      it('재고와 정확히 같은 수량을 차감하면 재고가 0이 된다', () => {
        // given - 재고 5개의 상품
        const exactStockProduct = aProduct({ stock: 5 });

        // when - 5개 차감
        exactStockProduct.decreaseStock(5);

        // then - 재고 0
        expect(exactStockProduct.stock).toBe(0);
      });

      it('연속으로 차감하면 누적되어 줄어든다', () => {
        // given - 재고 10개
        const product = aProduct({ stock: 10 });

        // when - 3, 2, 1 순서로 차감
        product.decreaseStock(3);
        product.decreaseStock(2);
        product.decreaseStock(1);

        // then - 누적 6개 차감, 재고 4
        expect(product.stock).toBe(4);
      });
    });

    describe('실패 케이스', () => {
      it('재고보다 많은 수량을 차감하려고 하면 NOT_ENOUGH_STOCK 예외를 던진다', () => {
        // given - 재고 2개
        const lowStockProduct = aProduct({ stock: 2 });

        // when - 5개 차감 시도
        const decreaseAction = (): void => lowStockProduct.decreaseStock(5);

        // then - CoreException + 정확한 에러 코드
        expect(decreaseAction).toThrow(CoreException);
        expect(decreaseAction).toThrow(
          expect.objectContaining({
            errorCode: ProductErrorCode.NOT_ENOUGH_STOCK,
          }),
        );
      });

      it.each([0, -1, -100])(
        '차감 수량이 %i 처럼 1 미만이면 QUANTITY_NOT_POSITIVE 예외를 던진다',
        (invalidQuantity) => {
          // given - 재고 충분한 상품
          const product = aProduct({ stock: 10 });

          // when - 부적절한 수량으로 차감 시도
          const decreaseAction = (): void =>
            product.decreaseStock(invalidQuantity);

          // then
          expect(decreaseAction).toThrow(
            expect.objectContaining({
              errorCode: ProductErrorCode.QUANTITY_NOT_POSITIVE,
            }),
          );
        },
      );
    });

    describe('불변성', () => {
      it('재고 부족으로 예외가 발생하면 재고 값은 변경되지 않는다', () => {
        // given - 재고 2개
        const lowStockProduct = aProduct({ stock: 2 });
        const stockBeforeFailure = lowStockProduct.stock;

        // when - 재고 부족한 차감 시도 (예외 발생)
        expect(() => lowStockProduct.decreaseStock(5)).toThrow();

        // then - 재고는 시도 전과 동일
        expect(lowStockProduct.stock).toBe(stockBeforeFailure);
      });

      it('수량 검증에 실패하면 재고 값은 변경되지 않는다', () => {
        // given
        const product = aProduct({ stock: 10 });
        const stockBeforeFailure = product.stock;

        // when
        expect(() => product.decreaseStock(-1)).toThrow();

        // then
        expect(product.stock).toBe(stockBeforeFailure);
      });
    });
  });
});
