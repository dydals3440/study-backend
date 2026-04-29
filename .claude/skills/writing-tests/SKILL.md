---
name: writing-tests
description: Use when writing or modifying any test (Unit, Integration, or E2E). Maps each layer to its test type, enforces Korean BDD spec naming with given/when/then comments, builder pattern for fixtures, expectNotNull for non-null narrowing, createMock for typed mocks, and the 6-category coverage matrix (success / boundary / repeated / business-failure / input-failure / invariance).
---

# Writing Tests

테스트는 *피라미드* 로 분담:

| 레이어 | 테스트 종류 | 위치 | 외부 의존 |
|---|---|---|---|
| `domain/<f>/*.model.ts` | **Unit** | `*.spec.ts` (co-located) | 없음 |
| `domain/<f>/*.service.ts` | **Unit** (mocked Repository) | `*.spec.ts` (co-located) | 없음 |
| `application/<f>/*.facade.ts` | **Unit** (mocked Service) | `*.spec.ts` (co-located) | 없음 |
| `infrastructure/<f>/*.repository.impl.ts` | **Integration** | `test/integration/*.int-spec.ts` | testcontainers MySQL |
| `interfaces/api/<f>/*.controller.ts` | **E2E** | `test/e2e/*.e2e-spec.ts` | testcontainers + Nest 앱 |

## 공통 컨벤션

### 1. 한국어 BDD 명세 (describe / it)

- 모든 `describe` / `it` 텍스트는 **한국어**
- 구조: `describe('<Class> 도메인 모델') > describe('<method> — <요약>') > describe('성공/실패/불변성') > it('<시나리오>')`

```ts
describe('Product 도메인 모델', () => {
  describe('decreaseStock — 재고 차감', () => {
    describe('성공 케이스', () => {
      it('재고가 충분하면 요청 수량만큼 차감된다', () => { /* ... */ });
    });
    describe('실패 케이스', () => {
      it('재고보다 많은 수량을 차감하려고 하면 NOT_ENOUGH_STOCK 예외를 던진다', () => { /* ... */ });
    });
    describe('불변성', () => {
      it('재고 부족으로 예외가 발생하면 재고 값은 변경되지 않는다', () => { /* ... */ });
    });
  });
});
```

### 2. given / when / then 코멘트 의무

```ts
it('재고가 충분하면 요청 수량만큼 차감된다', () => {
  // given - 재고 10개를 가진 상품
  const inStockProduct = aProduct({ stock: 10 });

  // when - 3개를 차감
  inStockProduct.decreaseStock(3);

  // then - 재고가 7로 감소
  expect(inStockProduct.stock).toBe(7);
});
```

코멘트가 *시나리오의 의도* 를 설명하게 — 단순 "given X" 보다 "given - 재고 10개를 가진 상품" 이 좋음.

### 3. 변수명은 시나리오 의도 표현

| 시나리오 | 좋은 변수명 |
|---|---|
| 정상 데이터 | `inStockProduct`, `validRequestBody`, `existingOrder` |
| 경계 | `exactStockProduct`, `zeroPriceItem` |
| 실패 입력 | `lowStockProduct`, `outOfStockProduct`, `invalidQuantityCommand` |
| 손상 데이터 | `corruptedRow`, `rowWithNullProductname` |
| 존재하지 않음 | `nonExistentId`, `customerWithoutCart` |

`product1`, `data`, `result` 같은 모호한 이름 X.

### 4. 6 카테고리 커버리지 매트릭스

각 메서드마다 *해당하는 것을 모두*:

| 카테고리 | 예시 |
|---|---|
| 성공 (대표) | 정상 입력 → 정상 결과 |
| 성공 (경계) | 한계값에서 정상 (재고 == 수량, 가격 0 등) |
| 성공 (반복/누적) | 메서드 여러 번 호출 시 상태 누적 |
| 실패 (비즈니스 룰) | 도메인 룰 위반 → 정확한 ErrorCode 예외 |
| 실패 (입력 검증) | 잘못된 인자 → BAD_REQUEST 예외 |
| 불변성 (예외 후) | 예외 시 *어떤 상태도 변경 없음* — 가장 잊기 쉬움 |

### 5. 빌더 사용 (절대 인라인 객체 X)

> 참고: `test/support/builders/`

```ts
import { aProduct } from '../../../test/support/builders/product.builder';

// 좋음
const product = aProduct({ stock: 10 });

// 나쁨 - 모델 필드 추가 시 깨짐
const product = Product.restore({ id: 1, name: 'X', price: 100, stock: 10 });
```

빌더는 `Partial<Parameters<typeof X.restore>[0]>` 패턴이라 *모델 시그니처 변경 시 컴파일 에러* 가 빌더 한 곳에서만 나고, 나머지 테스트는 자동 통과.

복합 aggregate (Order 등) 은 fluent builder:
```ts
const order = anOrder()
  .withCustomerId(42)
  .withItem(anOrderItem({ price: 5_000, quantity: 2 }))
  .build();
```

## Unit 테스트

### Domain model

> 참고: `src/domain/product/product.model.spec.ts`

외부 의존 없음. 6 카테고리 모두.

```ts
import { CoreException } from '../../support/error/core-exception';
import { ProductErrorCode } from './product-error-code';
import { aProduct } from '../../../test/support/builders/product.builder';

describe('Product 도메인 모델', () => {
  describe('decreaseStock — 재고 차감', () => {
    describe('성공 케이스', () => {
      it('재고가 충분하면 요청 수량만큼 차감된다', () => {
        const inStockProduct = aProduct({ stock: 10 });
        inStockProduct.decreaseStock(3);
        expect(inStockProduct.stock).toBe(7);
      });
      // 경계, 누적 케이스 추가
    });
    describe('실패 케이스', () => {
      it('재고보다 많은 수량을 차감하려고 하면 NOT_ENOUGH_STOCK 예외를 던진다', () => {
        const lowStockProduct = aProduct({ stock: 2 });
        expect(() => lowStockProduct.decreaseStock(5)).toThrow(
          expect.objectContaining({ errorCode: ProductErrorCode.NOT_ENOUGH_STOCK }),
        );
      });
      it.each([0, -1, -100])('차감 수량이 %i 처럼 1 미만이면 QUANTITY_NOT_POSITIVE 예외를 던진다', (invalidQuantity) => {
        const product = aProduct({ stock: 10 });
        expect(() => product.decreaseStock(invalidQuantity)).toThrow(
          expect.objectContaining({ errorCode: ProductErrorCode.QUANTITY_NOT_POSITIVE }),
        );
      });
    });
    describe('불변성', () => {
      it('재고 부족으로 예외가 발생하면 재고 값은 변경되지 않는다', () => {
        const lowStockProduct = aProduct({ stock: 2 });
        const stockBeforeFailure = lowStockProduct.stock;
        expect(() => lowStockProduct.decreaseStock(5)).toThrow();
        expect(lowStockProduct.stock).toBe(stockBeforeFailure);
      });
    });
  });
});
```

### Domain service / Application facade

> 참고: `src/domain/order/order.service.spec.ts`, `src/application/order/order.facade.spec.ts`

`@golevelup/ts-jest` 의 `createMock<T>()` 로 typed mock.

```ts
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { ProductRepository } from '../product/product.repository';

describe('OrderService', () => {
  let orderService: OrderService;
  let orderRepository: DeepMocked<OrderRepository>;
  let productRepository: DeepMocked<ProductRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: createMock<OrderRepository>() },
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
      ],
    }).compile();

    orderService = moduleRef.get(OrderService);
    orderRepository = moduleRef.get(OrderRepository);
    productRepository = moduleRef.get(ProductRepository);
  });

  describe('createOrder', () => {
    it('단일 항목: 락 조회 → 재고 차감 → 상품 저장 → 주문 저장 순서로 호출된다', async () => {
      // given
      const productInStock = aProduct({ id: 100, stock: 10, price: 5_000 });
      productRepository.findByIdForUpdate.mockResolvedValue(productInStock);
      productRepository.save.mockResolvedValue(productInStock);
      orderRepository.save.mockImplementation(async (o) => o);

      // when
      const persistedOrder = await orderService.createOrder(1, [
        new CreateOrderItemCommand({ productId: 100, quantity: 3 }),
      ]);

      // then
      expect(productRepository.findByIdForUpdate).toHaveBeenCalledWith(100, undefined);
      expect(productInStock.stock).toBe(7);
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(persistedOrder.totalPrice).toBe(15_000);
    });
  });
});
```

`createMock` 의 강점: Repository 시그니처 변경 시 모든 mock 호출에 컴파일 에러 → 정확한 위치 알려줌.

Facade 가 `prisma.$transaction` 사용 시 mock:
```ts
prismaService.$transaction.mockImplementation((callback: any) =>
  callback(createMock<Prisma.TransactionClient>()),
);
```

## Integration 테스트

> 참고: `test/integration/product.repository.int-spec.ts`

testcontainers + Prisma + 실제 MySQL.

```ts
import { startPrismaTestEnv, type PrismaTestEnv } from '../support/prisma-test-env';
import { ProductRepositoryImpl } from '../../src/infrastructure/product/product.repository.impl';
import { aProductRow } from '../support/builders/product.builder';
import { expectCoreExceptionAsync, expectNotNull } from '../support/expect-helpers';

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

  describe('findByIdForUpdate', () => {
    describe('성공 케이스', () => {
      it('해당 ID의 row가 존재하면 도메인 Product로 변환되어 반환된다', async () => {
        // given
        const insertedRow = await testEnv.prisma.product.create({
          data: aProductRow({ price: 5_000, qty: 10 }),
        });
        // when
        const foundProduct = await productRepository.findByIdForUpdate(insertedRow.id);
        // then
        expectNotNull(foundProduct);
        expect(foundProduct.price).toBe(5_000);
        expect(foundProduct.stock).toBe(10);
      });
    });
    describe('실패 케이스', () => {
      it('필수 필드(productname)가 null인 손상된 row는 CORRUPTED_ROW 예외를 던진다', async () => {
        const corruptedRow = await testEnv.prisma.product.create({
          data: aProductRow({ productname: null }),
        });
        await expectCoreExceptionAsync(
          () => productRepository.findByIdForUpdate(corruptedRow.id),
          ProductErrorCode.CORRUPTED_ROW,
        );
      });
    });
  });
});
```

핵심:
- `beforeAll: startPrismaTestEnv()` (60s timeout — 컨테이너 부팅)
- `afterAll: testEnv.cleanup()` (컨테이너 정지 + Prisma 연결 해제)
- `beforeEach: testEnv.truncate()` (테이블 비움 — 격리)
- 손상 시나리오 *반드시* 검증 — `aProductRow({ productname: null })` 같은 패턴
- DB 직접 조회로 side effect 검증 (`testEnv.prisma.product.findUnique(...)`)

## E2E 테스트

> 참고: `test/e2e/orders.e2e-spec.ts`

풀 NestJS 앱 + supertest + testcontainers.

```ts
import request from 'supertest';
import { createTestApp, type TestApp } from '../support/nest-test-app';
import { aProductRow } from '../support/builders/product.builder';
import { buildCreateOrderRequest } from '../support/builders/order.builder';

describe('주문 E2E', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await testApp.truncate();
  });

  describe('POST /api/v1/orders', () => {
    describe('성공 케이스', () => {
      it('주문이 생성되고 상품 재고가 차감되며 주문 상세가 영속화된다', async () => {
        // given
        const productInDb = await testApp.prisma.product.create({
          data: aProductRow({ price: 10_000, qty: 5 }),
        });
        const validBody = buildCreateOrderRequest({
          customerId: 1,
          items: [{ productId: productInDb.id, quantity: 2 }],
        });

        // when
        const response = await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(validBody)
          .expect(201);

        // then - HTTP 응답
        expect(response.body).toMatchObject({
          meta: { result: 'SUCCESS' },
          data: {
            customerId: 1,
            totalPrice: 20_000,
            orderItems: [{ productId: productInDb.id, quantity: 2 }],
          },
        });
        // then - DB side effect (재고 차감)
        const updated = await testApp.prisma.product.findUnique({ where: { id: productInDb.id } });
        expect(updated?.qty).toBe(3);
        // then - 주문 영속화
        expect(await testApp.prisma.order.findMany()).toHaveLength(1);
      });
    });

    describe('실패 케이스', () => {
      it('재고 부족이면 409 + product.not-enough-stock + 트랜잭션 롤백', async () => {
        const lowStockProduct = await testApp.prisma.product.create({
          data: aProductRow({ qty: 1 }),
        });

        await request(testApp.app.getHttpServer())
          .post('/api/v1/orders')
          .send(buildCreateOrderRequest({ items: [{ productId: lowStockProduct.id, quantity: 5 }] }))
          .expect(409);

        // 핵심: 트랜잭션 롤백 검증
        const productAfter = await testApp.prisma.product.findUnique({ where: { id: lowStockProduct.id } });
        expect(productAfter?.qty).toBe(1);
        expect(await testApp.prisma.order.findMany()).toHaveLength(0);
      });
    });
  });
});
```

E2E 의 본질: **HTTP 응답 + DB side effect 동시 검증**, 그리고 **트랜잭션 롤백을 *별도 케이스* 로 명시**.

## 헬퍼 사용

### `expectNotNull` — `!` 없이 narrowing

> `test/support/expect-helpers.ts`

```ts
const product = await repository.findByIdForUpdate(id);
expectNotNull(product);          // 이 줄 이후 product 는 Product (not null)
expect(product.stock).toBe(10);  // ! 없이 깔끔
```

`expect(x).not.toBeNull()` 은 jest matcher 라 TS 타입을 좁혀주지 않음. `expectNotNull` 이 *진짜* asserting function.

### `expectCoreExceptionAsync` / `expectCoreException`

```ts
// async
await expectCoreExceptionAsync(
  () => productRepository.findByIdForUpdate(corruptedRow.id),
  ProductErrorCode.CORRUPTED_ROW,
);

// sync
expectCoreException(
  () => product.decreaseStock(-1),
  ProductErrorCode.QUANTITY_NOT_POSITIVE,
);
```

수동으로 `expect(...).toThrow(expect.objectContaining({ errorCode }))` 보다 짧고 명시적.

## 빌더 작성 (새 도메인 추가 시)

`creating-feature` skill 참조. 핵심 패턴:

### 단일 엔티티 — Factory + `Partial<Parameters<typeof X.restore>[0]>`

```ts
type ProductProps = Parameters<typeof Product.restore>[0];

export const aProduct = (overrides: Partial<ProductProps> = {}): Product =>
  Product.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    name: faker.commerce.productName(),
    price: faker.number.int({ min: 1_000, max: 100_000 }),
    stock: faker.number.int({ min: 1, max: 100 }),
    ...overrides,
  });
```

### Aggregate — Builder 클래스

> 참고: `test/support/builders/order.builder.ts` 의 `OrderBuilder`

```ts
const order = anOrder()
  .withCustomerId(42)
  .withItem(anOrderItem({ price: 5_000, quantity: 2 }))
  .build();
```

`withItem` 이 자식을 누적하며 `originalPrice`/`totalPrice` 자동 계산.

### Row 빌더 (Integration / E2E 에서 DB 에 직접 삽입)

```ts
type ProductCreateInput = Prisma.productUncheckedCreateInput;

export const aProductRow = (overrides: Partial<ProductCreateInput> = {}): ProductCreateInput => ({
  productname: faker.commerce.productName(),
  price: faker.number.int({ min: 1_000, max: 100_000 }),
  qty: faker.number.int({ min: 1, max: 100 }),
  ...overrides,
});

// 사용: aProductRow({ productname: null })  ← 손상 시나리오 표현 가능
```

## 실행

```bash
pnpm test           # Unit only — TDD 사이클 빠르게 (<5초)
pnpm test:watch     # Unit watch
pnpm test:cov       # Unit + 커버리지
pnpm test:int       # Integration (Docker 필요, --runInBand)
pnpm test:e2e       # E2E (Docker 필요, --runInBand)
pnpm test:ci        # 전체 (cov + int + e2e)
```

`test:int` / `test:e2e` 는 `NODE_OPTIONS='--experimental-vm-modules'` 자동 적용 (Prisma 7 의 dynamic WASM import 때문). `--runInBand` 로 직렬 실행 (testcontainers 컨테이너 충돌 방지).

## 흔한 실수

1. **인라인 객체로 도메인 모델 생성** — 모델 변경 시 모든 테스트가 깨짐. 빌더 사용
2. **`!` 비-널 단언 사용** — ESLint error. `expectNotNull` 사용
3. **6 카테고리 중 *불변성* 누락** — 예외 발생 시 상태가 *변경되지 않았는지* 검증 안 하면 부분 변경 회귀 못 잡음
4. **E2E 에서 DB side effect 검증 안 함** — HTTP 200 만 보고 끝나면 실제로 DB 에 들어갔는지 모름
5. **트랜잭션 롤백을 *별도 테스트* 로 안 만듦** — 실패 케이스에서 상태가 정말 안 바뀌었는지 *명시적* 검증 필요
6. **describe / it 영어로 작성** — 한국어 명세 컨벤션 깨짐
7. **`createMock` 안 쓰고 수동 mock** — 타입 안전성 잃음. 시그니처 변경 시 회귀 못 잡음
8. **변수명이 `product`, `order`, `data`** — 시나리오 의도 불명. `inStockProduct`, `lowStockProduct` 등으로
