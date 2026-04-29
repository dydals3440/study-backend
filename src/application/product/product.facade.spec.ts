import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { ProductService } from '../../domain/product/product.service';
import { aProduct } from '../../../test/support/builders/product.builder';
import { ProductFacade } from './product.facade';
import { ProductInfo } from './product.info';

describe('ProductFacade', () => {
  let productFacade: ProductFacade;
  let productService: DeepMocked<ProductService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductFacade,
        { provide: ProductService, useValue: createMock<ProductService>() },
      ],
    }).compile();

    productFacade = moduleRef.get(ProductFacade);
    productService = moduleRef.get(ProductService);
  });

  describe('getProduct', () => {
    describe('성공 케이스', () => {
      it('service 가 반환한 Product 를 ProductInfo 로 변환하여 반환한다', async () => {
        // given
        const targetId = 1;
        const product = aProduct({
          id: targetId,
          name: '상품A',
          price: 5_000,
          stock: 10,
        });
        productService.findById.mockResolvedValue(product);

        // when
        const result = await productFacade.getProduct(targetId);

        // then - 타입 + 값 모두 검증
        expect(result).toBeInstanceOf(ProductInfo);
        expect(result).toMatchObject({
          id: targetId,
          name: '상품A',
          price: 5_000,
          stock: 10,
        });
        expect(productService.findById).toHaveBeenCalledWith(targetId);
      });
    });

    describe('실패 케이스', () => {
      it('service 가 예외를 던지면 그대로 전파한다', async () => {
        // given
        const expectedError = new Error('NOT_FOUND');
        productService.findById.mockRejectedValue(expectedError);

        // when
        const action = (): Promise<ProductInfo> =>
          productFacade.getProduct(999);

        // then
        await expect(action()).rejects.toBe(expectedError);
      });
    });
  });
});
