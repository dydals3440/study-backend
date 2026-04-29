import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import {
  aCart,
  anAddCartItemCommand,
} from '../../../test/support/builders/cart.builder';
import { Cart } from './cart.model';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

describe('CartService', () => {
  let cartService: CartService;
  let cartRepository: DeepMocked<CartRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: createMock<CartRepository>() },
      ],
    }).compile();

    cartService = moduleRef.get(CartService);
    cartRepository = moduleRef.get(CartRepository);
  });

  describe('findByCustomerId', () => {
    it('repository 결과를 그대로 위임한다', async () => {
      // given
      const customerId = 1;
      const expectedCarts = [aCart({ customerId }), aCart({ customerId })];
      cartRepository.findByCustomerId.mockResolvedValue(expectedCarts);

      // when
      const result = await cartService.findByCustomerId(customerId);

      // then
      expect(result).toBe(expectedCarts);
      expect(cartRepository.findByCustomerId).toHaveBeenCalledWith(
        customerId,
        undefined,
      );
    });

    it('repository 가 빈 배열을 반환하면 그대로 반환한다', async () => {
      // given
      cartRepository.findByCustomerId.mockResolvedValue([]);

      // when
      const result = await cartService.findByCustomerId(1);

      // then
      expect(result).toEqual([]);
    });
  });

  describe('addItem', () => {
    describe('성공 케이스', () => {
      it('command 로부터 Cart 를 생성하여 repository.save 에 위임한다', async () => {
        // given
        const validCommand = anAddCartItemCommand({
          customerId: 1,
          productId: 100,
          unitPrice: 5_000,
          quantity: 3,
        });
        const savedCart = aCart({
          id: 42,
          customerId: 1,
          productId: 100,
          unitPrice: 5_000,
          quantity: 3,
        });
        cartRepository.save.mockResolvedValue(savedCart);

        // when
        const result = await cartService.addItem(validCommand);

        // then - 저장된 결과 + repository 호출 인자 검증
        expect(result).toBe(savedCart);
        expect(cartRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            customerId: 1,
            productId: 100,
            unitPrice: 5_000,
            quantity: 3,
          }),
          undefined,
        );
      });
    });

    describe('실패 케이스', () => {
      it('Cart.create 검증이 실패하면 (수량 0) repository.save 가 호출되지 않고 예외가 전파된다', async () => {
        // given - 잘못된 수량
        const invalidCommand = anAddCartItemCommand({ quantity: 0 });

        // when
        const action = (): Promise<Cart> => cartService.addItem(invalidCommand);

        // then
        await expect(action()).rejects.toThrow();
        expect(cartRepository.save).not.toHaveBeenCalled();
      });

      it('Cart.create 검증이 실패하면 (가격 음수) repository.save 가 호출되지 않는다', async () => {
        // given
        const invalidCommand = anAddCartItemCommand({ unitPrice: -1 });

        // when
        const action = (): Promise<Cart> => cartService.addItem(invalidCommand);

        // then
        await expect(action()).rejects.toThrow();
        expect(cartRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteByCustomerId', () => {
    it('repository.deleteByCustomerId 를 그대로 호출한다', async () => {
      // given
      const customerId = 1;

      // when
      await cartService.deleteByCustomerId(customerId);

      // then
      expect(cartRepository.deleteByCustomerId).toHaveBeenCalledWith(
        customerId,
        undefined,
      );
    });
  });
});
