import { CartErrorCode } from '../../src/domain/cart/cart-error-code';
import { Cart } from '../../src/domain/cart/cart.model';
import { CartRepositoryImpl } from '../../src/infrastructure/cart/cart.repository.impl';
import { aCartRow } from '../support/builders/cart.builder';
import {
  expectCoreExceptionAsync,
  expectNotNull,
} from '../support/expect-helpers';
import {
  startPrismaTestEnv,
  type PrismaTestEnv,
} from '../support/prisma-test-env';

describe('CartRepositoryImpl 통합 테스트 (실제 MySQL)', () => {
  let testEnv: PrismaTestEnv;
  let cartRepository: CartRepositoryImpl;

  beforeAll(async () => {
    testEnv = await startPrismaTestEnv();
    cartRepository = new CartRepositoryImpl(testEnv.prisma);
  }, 60_000);

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.truncate();
  });

  describe('findByCustomerId', () => {
    describe('성공 케이스', () => {
      it('해당 customer 의 row 들만 도메인 Cart 로 변환되어 반환된다', async () => {
        // given - 두 고객의 장바구니 row
        const targetCustomerId = 1;
        const otherCustomerId = 2;
        await testEnv.prisma.cart.createMany({
          data: [
            aCartRow({ customer_id: targetCustomerId, product_id: 100 }),
            aCartRow({ customer_id: targetCustomerId, product_id: 101 }),
            aCartRow({ customer_id: otherCustomerId, product_id: 200 }),
          ],
        });

        // when
        const result = await cartRepository.findByCustomerId(targetCustomerId);

        // then
        expect(result).toHaveLength(2);
        expect(
          result.every((cart) => cart.customerId === targetCustomerId),
        ).toBe(true);
      });

      it('해당 customer 의 row 가 없으면 빈 배열을 반환한다', async () => {
        // given - 어떤 row 도 없음
        const customerWithoutCart = 999;

        // when
        const result =
          await cartRepository.findByCustomerId(customerWithoutCart);

        // then
        expect(result).toEqual([]);
      });
    });

    describe('실패 케이스', () => {
      it('필수 필드(qty)가 null 인 손상된 row 는 CORRUPTED_ROW 예외를 던진다', async () => {
        // given
        await testEnv.prisma.cart.create({
          data: aCartRow({ customer_id: 1, qty: null }),
        });

        // when
        const action = (): Promise<unknown> =>
          cartRepository.findByCustomerId(1);

        // then
        await expectCoreExceptionAsync(action, CartErrorCode.CORRUPTED_ROW);
      });
    });
  });

  describe('save', () => {
    it('id 가 0 이면 새 row 를 insert 하고 할당된 id 를 반환한다', async () => {
      // given - id=0 인 새 Cart
      const newCart = Cart.create({
        customerId: 1,
        productId: 100,
        unitPrice: 5_000,
        quantity: 2,
      });

      // when
      const savedCart = await cartRepository.save(newCart);

      // then
      expect(savedCart.id).toBeGreaterThan(0);
      const persistedRow = await testEnv.prisma.cart.findUnique({
        where: { id: savedCart.id },
      });
      expectNotNull(persistedRow);
      expect(persistedRow.customer_id).toBe(1);
      expect(persistedRow.product_id).toBe(100);
      expect(persistedRow.unit_price).toBe(5_000);
      expect(persistedRow.qty).toBe(2);
    });
  });

  describe('deleteByCustomerId', () => {
    it('해당 customer 의 row 만 모두 삭제하고 다른 customer 는 영향 없다', async () => {
      // given - 두 고객의 장바구니
      const targetCustomerId = 1;
      const otherCustomerId = 2;
      await testEnv.prisma.cart.createMany({
        data: [
          aCartRow({ customer_id: targetCustomerId }),
          aCartRow({ customer_id: targetCustomerId }),
          aCartRow({ customer_id: otherCustomerId }),
        ],
      });

      // when
      await cartRepository.deleteByCustomerId(targetCustomerId);

      // then
      const remainingForTarget = await testEnv.prisma.cart.findMany({
        where: { customer_id: targetCustomerId },
      });
      const remainingForOther = await testEnv.prisma.cart.findMany({
        where: { customer_id: otherCustomerId },
      });
      expect(remainingForTarget).toHaveLength(0);
      expect(remainingForOther).toHaveLength(1);
    });
  });
});
