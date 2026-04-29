import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { aProduct } from '../../../test/support/builders/product.builder';
import { expectCoreExceptionAsync } from '../../../test/support/expect-helpers';
import { ProductErrorCode } from './product-error-code';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let productService: ProductService;
  let productRepository: DeepMocked<ProductRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
      ],
    }).compile();

    productService = moduleRef.get(ProductService);
    productRepository = moduleRef.get(ProductRepository);
  });

  describe('findById', () => {
    describe('성공 케이스', () => {
      it('repository 가 Product 를 반환하면 그대로 반환한다', async () => {
        // given - 존재하는 상품 id
        const targetId = 1;
        const expectedProduct = aProduct({ id: targetId, stock: 10 });
        productRepository.findById.mockResolvedValue(expectedProduct);

        // when
        const result = await productService.findById(targetId);

        // then
        expect(result).toBe(expectedProduct);
        expect(productRepository.findById).toHaveBeenCalledWith(
          targetId,
          undefined,
        );
      });
    });

    describe('실패 케이스', () => {
      it('repository 가 null 을 반환하면 NOT_FOUND 예외를 던진다', async () => {
        // given - 존재하지 않는 id
        const nonExistentId = 999;
        productRepository.findById.mockResolvedValue(null);

        // when
        const action = (): Promise<unknown> =>
          productService.findById(nonExistentId);

        // then
        await expectCoreExceptionAsync(action, ProductErrorCode.NOT_FOUND);
        expect(productRepository.findById).toHaveBeenCalledWith(
          nonExistentId,
          undefined,
        );
      });
    });
  });
});
