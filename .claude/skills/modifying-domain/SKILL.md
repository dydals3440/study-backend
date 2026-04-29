---
name: modifying-domain
description: Use when modifying an existing domain model — adding/removing fields, changing invariants, adding behavior methods. Lists every place that needs propagation (DB schema, model, repository.impl toModel, info, dto, builder, tests) so the change stays atomic.
---

# Modifying a Domain Model

기존 도메인 모델 (`Product`, `Cart`, `Order`, `OrderItem` 등) 의 *형태나 행위* 를 변경할 때. 4-Layer 구조에서 도메인 변경은 *여러 layer 에 파급* 되므로 누락 없이 추적해야 함.

## When to Use

- 도메인 모델에 필드 추가 (예: `Product.category`)
- 필드 제거 / 이름 변경
- 새 비즈니스 행위 (메서드) 추가
- invariant 강화 (검증 규칙 변경)
- enum 값 추가/변경 (예: `OrderStatus.REFUNDED`)

## 변경 종류별 영향 매트릭스

| 변경 | 파급 |
|---|---|
| **필드 추가** | schema → migrate → model `restore` props → `toModel` (infra) → `save` (infra write) → `Info.from` → builder → 영향 받는 spec |
| **필드 제거** | (역순) — spec 부터 정리 후 → builder → Info → toModel/save → restore props → schema migrate |
| **필드 이름 변경** | grep 으로 모든 사용처 찾기 — TS 컴파일러가 *대부분* 잡지만, 문자열로 참조하는 곳 (Prisma `where: { foo: ... }`) 은 수동 |
| **새 메서드 (행위)** | model → 호출 측 (service / facade) → 새 spec 케이스 |
| **invariant 강화** | model → 영향 받는 spec (기존 통과하던 입력이 throw 될 수 있음) |
| **enum 값 추가** | enum 파일 → restore 시 `toStatus` 검증 (infra) → 영향 받는 spec |

## 영향 추적 — TS 컴파일러를 친구로

핵심 통찰: `Parameters<typeof X.restore>[0]` 가 *원본 타입* 이라, 모델 시그니처가 바뀌면 *모든 빌더 / Info / 테스트* 가 컴파일 에러로 위치를 알려준다.

```ts
// test/support/builders/product.builder.ts
type ProductProps = Parameters<typeof Product.restore>[0];

export const aProduct = (overrides: Partial<ProductProps> = {}): Product =>
  Product.restore({
    id: ...,
    name: ...,
    price: ...,
    stock: ...,
    ...overrides,
  });
```

`Product.restore` 에 `category: string` 추가 →  spread literal 의 컴파일 에러 → 빌더에 한 줄 추가하면 끝. 기존 60 개 spec 은 자동 통과 (faker 가 default 채움).

## 단계별 가이드

### A. 필드 추가 (가장 흔한 케이스)

> 참고: `src/domain/product/product.model.ts` 의 구조

#### Step 1. Prisma schema

```prisma
// prisma/schema.prisma
model product {
  id          Int     @id @default(autoincrement())
  productname String? @db.VarChar(255)
  price       Int?
  qty         Int?
  category    String? @db.VarChar(255)  // ← 추가 (가능하면 NOT NULL 권장)
}
```

`pnpm prisma:migrate` 로 마이그레이션 생성 + 적용. 클라이언트 자동 재생성.

#### Step 2. Domain model

```ts
// src/domain/product/product.model.ts
export class Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly category: string;  // ← 추가
  #stock: number;

  private constructor(props: {
    id: number;
    name: string;
    price: number;
    category: string;  // ← 추가
    stock: number;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.price = props.price;
    this.category = props.category;  // ← 추가
    this.#stock = props.stock;
  }

  static restore(props: {
    id: number;
    name: string;
    price: number;
    category: string;  // ← 추가
    stock: number;
  }): Product {
    return new Product(props);
  }

  // 기존 메서드들...
}
```

#### Step 3. `toModel` (infrastructure) — 가장 잊기 쉬움

```ts
// src/infrastructure/product/product.repository.impl.ts
private static toModel(row: ProductRow): Product {
  if (
    row.productname === null ||
    row.price === null ||
    row.qty === null ||
    row.category === null  // ← 추가 (필수면)
  ) {
    throw new CoreException(ErrorType.INTERNAL, ProductErrorCode.CORRUPTED_ROW, { id: row.id });
  }
  return Product.restore({
    id: row.id,
    name: row.productname,
    price: row.price,
    stock: row.qty,
    category: row.category,  // ← 추가
  });
}
```

#### Step 4. `save` (infrastructure) — write path 도 갱신

```ts
async save(product: Product, tx: Prisma.TransactionClient = this.prisma): Promise<Product> {
  if (product.id === 0) {
    const created = await tx.product.create({
      data: {
        productname: product.name,
        price: product.price,
        qty: product.stock,
        category: product.category,  // ← 추가
      },
    });
    return ProductRepositoryImpl.toModel(created);
  }
  // update path 도 동일하게 추가
}
```

#### Step 5. Info / Response

응답에도 노출할 필드라면:
```ts
// src/application/product/product.info.ts
export class ProductInfo {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly category: string;  // ← 추가

  static from(model: Product): ProductInfo {
    return new ProductInfo({
      id: model.id, name: model.name, price: model.price,
      stock: model.stock,
      category: model.category,  // ← 추가
    });
  }
}
```

```ts
// src/interfaces/api/product/product-v1.dto.ts
export class ProductResponse {
  @ApiProperty() readonly category: string;  // ← 추가
  static from(info: ProductInfo): ProductResponse { /* category 매핑 */ }
}
```

내부 전용 (Response 에 노출 안 함) 이면 Info / Response 는 건드리지 않음.

#### Step 6. Builder

```ts
// test/support/builders/product.builder.ts
export const aProduct = (overrides: Partial<ProductProps> = {}): Product =>
  Product.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    name: faker.commerce.productName(),
    price: faker.number.int({ min: 1_000, max: 100_000 }),
    stock: faker.number.int({ min: 1, max: 100 }),
    category: faker.commerce.department(),  // ← 추가 — 한 줄로 끝
    ...overrides,
  });

// row builder 도
export const aProductRow = (overrides: Partial<ProductCreateInput> = {}): ProductCreateInput => ({
  productname: faker.commerce.productName(),
  price: faker.number.int({ min: 1_000, max: 100_000 }),
  qty: faker.number.int({ min: 1, max: 100 }),
  category: faker.commerce.department(),  // ← 추가
  ...overrides,
});
```

#### Step 7. 테스트

기존 spec 은 컴파일 통과하면 자동 OK. 단 *category 검증 케이스* 가 새로 필요하면 추가:
```ts
// src/domain/product/product.model.spec.ts (예시)
it('category 가 비어있으면 ... ', () => { /* ... */ });
```

`toModel` 의 CORRUPTED_ROW 케이스도 새 필드 기준으로 추가:
```ts
// test/integration/product.repository.int-spec.ts
it('category 가 null 인 손상된 row 는 CORRUPTED_ROW 예외를 던진다', async () => { /* ... */ });
```

#### Step 8. 검증

```bash
pnpm tsc --noEmit          # 컴파일 에러 0
pnpm test                  # unit 통과
pnpm test:int              # toModel 회귀 잡힘
pnpm test:e2e              # 응답에 새 필드 포함되는지 (Info/Response 변경했다면)
```

### B. 필드 제거

역순으로:
1. 영향 받는 spec 에서 해당 필드 사용처 정리
2. Builder 의 default 제거
3. Info / Response 정리
4. `save` (write) / `toModel` (read) 정리
5. Model 의 `restore` props / 필드 / 메서드 정리
6. Schema 마이그레이션 (`pnpm prisma:migrate` — 컬럼 drop)

`tsc --noEmit` 가 모든 사용처를 알려주므로 컴파일 에러 따라가면 됨.

### C. 새 메서드 (행위) 추가

> 참고: `src/domain/product/product.model.ts` 의 `decreaseStock`

```ts
// src/domain/product/product.model.ts
applyDiscount(amount: number): void {
  if (amount < 0) {
    throw new CoreException(ErrorType.BAD_REQUEST, ProductErrorCode.DISCOUNT_NEGATIVE, { amount });
  }
  if (amount > this.price) {
    throw new CoreException(ErrorType.CONFLICT, ProductErrorCode.DISCOUNT_EXCEEDS_PRICE, { amount, price: this.price });
  }
  // ... 상태 변경
}
```

테스트 (`product.model.spec.ts`) 에 *6 카테고리* 빠짐없이:
- 성공 (대표) / 성공 (경계) / 성공 (반복)
- 실패 (입력 검증) / 실패 (비즈니스 룰)
- 불변성 (예외 시 상태 변경 없음)

`writing-tests` skill 참조.

### D. invariant 강화 (검증 규칙 변경)

예: `OrderItem` 의 `quantity >= 1` 을 `quantity >= 1 && quantity <= 100` 으로 변경.

```ts
// src/domain/order/order-item.model.ts
static create(props: { ... }): OrderItem {
  if (props.quantity < 1) {
    throw new CoreException(ErrorType.BAD_REQUEST, OrderErrorCode.QUANTITY_NOT_POSITIVE, { ... });
  }
  if (props.quantity > 100) {  // ← 추가
    throw new CoreException(ErrorType.BAD_REQUEST, OrderErrorCode.QUANTITY_TOO_LARGE, { ... });
  }
  // ...
}
```

기존 *통과하던* 케이스 중 새 룰을 위반하는 게 있으면 spec 이 깨짐. 이게 의도된 변경이라면 spec 수정 + 새 케이스 추가.

### E. enum 값 추가

```ts
// src/domain/order/order-status.ts
export const OrderStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',  // ← 추가
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

`toStatus` (infrastructure) 가 자동으로 새 값을 받아들임 (`Object.values(OrderStatus)` 순회 패턴이라). 별도 변경 불필요.

새 status 로 전이하는 행위 메서드가 있다면 model 에 추가 (`refund()` 등).

## 검증 (모든 변경 종류 공통)

```bash
pnpm tsc --noEmit          # 변경의 *모든 영향 위치* 가 컴파일 에러로 노출됨 — 친구임
pnpm lint                  # 추가 정정
pnpm test                  # 도메인 unit
pnpm test:int              # toModel / save 회귀 (특히 새 필드/CORRUPTED_ROW)
pnpm test:e2e              # 응답 shape 검증 (Info/Response 변경 시)
```

## 흔한 실수

1. **`toModel` 만 고치고 `save` 안 고침** — 읽기는 새 필드 매핑되지만 쓰기 시 누락 → DB row 일부 비어있게 됨
2. **builder 안 고침** — 테스트가 *컴파일 에러* 폭발 → 다 고치기 귀찮음. 빌더 한 줄만 고치면 사실 끝
3. **schema migrate 잊음** — 코드는 멀쩡한데 런타임에 *unknown column* 에러
4. **Info / Response 수정 잊음** — 도메인엔 들어왔는데 응답에 안 노출 → 클라이언트 영향
5. **CORRUPTED_ROW 검증에 새 필드 안 더함** — 새 필드가 null 인 row 를 만났을 때 도메인이 받아들임 → 다른 곳에서 터짐
6. **enum 값 추가 후 status 변환 메서드 안 만듦** — DB 에 새 값 들어갈 수단 없음
7. **invariant 강화 시 기존 spec 안 봄** — 회귀가 실수로 통과
