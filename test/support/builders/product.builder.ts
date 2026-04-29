import { faker } from '@faker-js/faker';
import type { Prisma } from '../../../src/generated/prisma/client';
import { Product } from '../../../src/domain/product/product.model';

type ProductProps = Parameters<typeof Product.restore>[0];
type ProductCreateInput = Prisma.productUncheckedCreateInput;

/**
 * 도메인 Product 인스턴스 빌더.
 * 모델에 새 필드가 추가되면 `Product.restore` 시그니처가 바뀌면서
 * 이 함수의 spread literal 에서 컴파일 에러가 발생 — 한 곳만 수정하면 끝.
 */
export const aProduct = (overrides: Partial<ProductProps> = {}): Product =>
  Product.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    name: faker.commerce.productName(),
    price: faker.number.int({ min: 1_000, max: 100_000 }),
    stock: faker.number.int({ min: 1, max: 100 }),
    ...overrides,
  });

/**
 * `tx.product.create({ data })` 에 그대로 넘길 수 있는 row 빌더.
 * Integration / E2E 테스트에서 사실적인 row 를 DB 에 미리 삽입할 때 사용.
 * `productname: null` 처럼 손상 시나리오도 표현 가능.
 */
export const aProductRow = (
  overrides: Partial<ProductCreateInput> = {},
): ProductCreateInput => ({
  productname: faker.commerce.productName(),
  price: faker.number.int({ min: 1_000, max: 100_000 }),
  qty: faker.number.int({ min: 1, max: 100 }),
  ...overrides,
});
