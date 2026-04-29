import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { CartService } from '../../domain/cart/cart.service';
import {
  aCart,
  anAddCartItemCommand,
} from '../../../test/support/builders/cart.builder';
import { CartFacade } from './cart.facade';
import { CartInfo } from './cart.info';

describe('CartFacade', () => {
  let cartFacade: CartFacade;
  let cartService: DeepMocked<CartService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CartFacade,
        { provide: CartService, useValue: createMock<CartService>() },
      ],
    }).compile();

    cartFacade = moduleRef.get(CartFacade);
    cartService = moduleRef.get(CartService);
  });

  describe('addItem', () => {
    it('service 가 저장한 Cart 를 CartInfo 로 변환하여 반환한다', async () => {
      // given
      const command = anAddCartItemCommand({
        customerId: 1,
        productId: 100,
        unitPrice: 5_000,
        quantity: 2,
      });
      const savedCart = aCart({
        id: 42,
        customerId: 1,
        productId: 100,
        unitPrice: 5_000,
        quantity: 2,
      });
      cartService.addItem.mockResolvedValue(savedCart);

      // when
      const result = await cartFacade.addItem(command);

      // then
      expect(result).toBeInstanceOf(CartInfo);
      expect(result).toMatchObject({
        id: 42,
        customerId: 1,
        productId: 100,
        unitPrice: 5_000,
        quantity: 2,
      });
      expect(cartService.addItem).toHaveBeenCalledWith(command);
    });
  });

  describe('getCart', () => {
    it('service 가 반환한 Cart 배열을 CartInfo 배열로 변환한다', async () => {
      // given
      const customerId = 1;
      const carts = [
        aCart({ id: 1, customerId, productId: 10 }),
        aCart({ id: 2, customerId, productId: 20 }),
      ];
      cartService.findByCustomerId.mockResolvedValue(carts);

      // when
      const result = await cartFacade.getCart(customerId);

      // then
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(CartInfo);
      expect(result[0]?.productId).toBe(10);
      expect(result[1]?.productId).toBe(20);
    });

    it('service 가 빈 배열을 반환하면 빈 배열을 그대로 반환한다', async () => {
      // given
      cartService.findByCustomerId.mockResolvedValue([]);

      // when
      const result = await cartFacade.getCart(1);

      // then
      expect(result).toEqual([]);
    });
  });

  describe('clear', () => {
    it('service.deleteByCustomerId 를 호출한다', async () => {
      // given
      const customerId = 1;

      // when
      await cartFacade.clear(customerId);

      // then
      expect(cartService.deleteByCustomerId).toHaveBeenCalledWith(customerId);
    });

    it('service 가 예외를 던지면 그대로 전파한다', async () => {
      // given
      const expectedError = new Error('DB error');
      cartService.deleteByCustomerId.mockRejectedValue(expectedError);

      // when
      const action = (): Promise<void> => cartFacade.clear(1);

      // then
      await expect(action()).rejects.toBe(expectedError);
    });
  });
});
