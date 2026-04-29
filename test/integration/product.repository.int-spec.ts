import { ProductErrorCode } from '../../src/domain/product/product-error-code';
import { Product } from '../../src/domain/product/product.model';
import { ProductRepositoryImpl } from '../../src/infrastructure/product/product.repository.impl';
import { aProductRow } from '../support/builders/product.builder';
import {
  expectCoreExceptionAsync,
  expectNotNull,
} from '../support/expect-helpers';
import {
  startPrismaTestEnv,
  type PrismaTestEnv,
} from '../support/prisma-test-env';

describe('ProductRepositoryImpl 통합 테스트 (실제 MySQL)', () => {
  let testEnv: PrismaTestEnv;
  let productRepository: ProductRepositoryImpl;

  beforeAll(async () => {
    testEnv = await startPrismaTestEnv();
    productRepository = new ProductRepositoryImpl(testEnv.prisma);
  }, 60_000);

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.truncate();
  });

  describe('findByIdForUpdate — FOR UPDATE 락 조회', () => {
    describe('성공 케이스', () => {
      it('해당 ID 의 row 가 존재하면 도메인 Product 로 변환되어 반환된다', async () => {
        // given - DB 에 상품 row 1건 삽입
        const insertedRow = await testEnv.prisma.product.create({
          data: aProductRow({ price: 5_000, qty: 10 }),
        });

        // when
        const foundProduct = await productRepository.findByIdForUpdate(
          insertedRow.id,
        );

        // then - 도메인 모델로 매핑된 결과 검증
        expectNotNull(foundProduct);
        expect(foundProduct.id).toBe(insertedRow.id);
        expect(foundProduct.price).toBe(5_000);
        expect(foundProduct.stock).toBe(10);
      });
    });

    describe('실패 케이스', () => {
      it('존재하지 않는 ID 로 조회하면 null 을 반환한다', async () => {
        // given - 어떤 row 도 삽입하지 않음
        const nonExistentId = 999_999;

        // when
        const result = await productRepository.findByIdForUpdate(nonExistentId);

        // then
        expect(result).toBeNull();
      });

      it('필수 필드(productname)가 null 인 손상된 row 는 CORRUPTED_ROW 예외를 던진다', async () => {
        // given - 도메인 비-null 보장을 위반하는 row 직접 삽입
        // (DB schema 는 nullable 이지만 도메인은 항상 non-null 을 요구)
        const corruptedRow = await testEnv.prisma.product.create({
          data: aProductRow({ productname: null }),
        });

        // when
        const action = (): Promise<unknown> =>
          productRepository.findByIdForUpdate(corruptedRow.id);

        // then
        await expectCoreExceptionAsync(action, ProductErrorCode.CORRUPTED_ROW);
      });
    });
  });

  describe('save — insert / update 분기', () => {
    it('id 가 0 이면 새 row 를 insert 하고 할당된 id 를 반환한다', async () => {
      // given - id=0 인 새 도메인 객체
      const newProduct = Product.restore({
        id: 0,
        name: '새 상품',
        price: 8_000,
        stock: 50,
      });

      // when
      const savedProduct = await productRepository.save(newProduct);

      // then - DB 가 부여한 id + 실제 row 영속화
      expect(savedProduct.id).toBeGreaterThan(0);
      const persistedRow = await testEnv.prisma.product.findUnique({
        where: { id: savedProduct.id },
      });
      expectNotNull(persistedRow);
      expect(persistedRow.productname).toBe('새 상품');
      expect(persistedRow.price).toBe(8_000);
      expect(persistedRow.qty).toBe(50);
    });

    it('id 가 0 이 아니면 기존 row 의 컬럼을 update 한다', async () => {
      // given - DB 에 row 삽입 후, 도메인에서 stock 수정
      const insertedRow = await testEnv.prisma.product.create({
        data: aProductRow({ qty: 100 }),
      });
      const reloaded = await productRepository.findById(insertedRow.id);
      expectNotNull(reloaded);
      reloaded.decreaseStock(30); // stock: 100 → 70

      // when
      await productRepository.save(reloaded);

      // then - DB row 의 qty 가 갱신됨
      const updatedRow = await testEnv.prisma.product.findUnique({
        where: { id: insertedRow.id },
      });
      expect(updatedRow?.qty).toBe(70);
    });
  });

  describe('findById', () => {
    it('존재하면 Product 반환, 없으면 null 반환', async () => {
      // given
      const inserted = await testEnv.prisma.product.create({
        data: aProductRow(),
      });

      // when
      const foundProduct = await productRepository.findById(inserted.id);
      const missingProduct = await productRepository.findById(999_999);

      // then
      expectNotNull(foundProduct);
      expect(foundProduct.id).toBe(inserted.id);
      expect(missingProduct).toBeNull();
    });
  });
});
