---
name: handling-errors
description: Use when defining a new error code, deciding where to throw an exception, or shaping an error response. Codifies the CoreException(ErrorType, ErrorCode, detail?) pattern, when to add a new entry to a feature's error-code.ts, the layer-to-ErrorType decision tree, and the CORRUPTED_ROW pattern for repository toModel null-defense.
---

# Handling Errors

모든 에러는 `CoreException` 으로 던진다. 직접 `throw new Error(...)` / `throw new HttpException(...)` 금지.

## 에러 모델 구조

```
CoreException(ErrorType, ErrorCode, detail?)
   ↑                ↑          ↑           ↑
   |   HTTP status 매핑  도메인 코드/메시지  추가 컨텍스트 (id, requested 등)
   └── extends HttpException, Nest 가 자동으로 JSON 응답 변환
```

응답 JSON:
```json
{
  "statusCode": 404,
  "type": "error.not-found",
  "code": "order.not-found",
  "message": "주문을 찾을 수 없습니다.",
  "detail": { "id": 42 }
}
```

## ErrorType — HTTP status 매핑

> `src/support/error/error-type.ts`

| ErrorType | HttpStatus | 언제 |
|---|---|---|
| `BAD_REQUEST` | 400 | 입력 검증 실패 (수량 0 이하, 음수 가격, 빈 배열 등) |
| `NOT_FOUND` | 404 | 리소스 없음 (id로 조회했는데 null) |
| `CONFLICT` | 409 | 비즈니스 룰 위반 (재고 부족, 중복 등) — 입력 자체는 정상이지만 현재 상태와 충돌 |
| `FORBIDDEN` | 403 | 권한 없음 (현재 미사용 — auth 도입 시) |
| `INTERNAL` | 500 | 시스템 손상 (DB row corruption, 예상 외 상태 등) |

## ErrorCode — 도메인별 식별자

각 도메인은 `<feature>-error-code.ts` 에 자기 에러 맵을 가진다. `as const satisfies Record<string, ErrorCode>` 패턴으로.

```ts
// src/domain/order/order-error-code.ts
import { ErrorCode } from '../../support/error/error-code';

export const OrderErrorCode = {
  NOT_FOUND: { code: 'order.not-found', message: '주문을 찾을 수 없습니다.' },
  ITEMS_EMPTY: { code: 'order.items.empty', message: '주문 항목은 비어있을 수 없습니다.' },
  CORRUPTED_ROW: { code: 'order.corrupted-row', message: '주문 데이터가 손상되었습니다.' },
  // ... 비즈니스 룰별 항목 추가
} as const satisfies Record<string, ErrorCode>;
export type OrderErrorCode = (typeof OrderErrorCode)[keyof typeof OrderErrorCode];
```

코드 컨벤션:
- key: `SCREAMING_SNAKE_CASE` (`NOT_ENOUGH_STOCK`)
- code: `<feature>.<kebab-case>` (`product.not-enough-stock`)
- message: 한국어 사용자용 메시지 (UI 가 그대로 노출 가능)

## 어디서 throw 하나 — 결정 트리

| 상황 | 위치 | ErrorType | 예시 |
|---|---|---|---|
| 입력 검증 실패 (수량/가격 등) | `domain/<f>/*.model.ts` 의 `create` 또는 메서드 | `BAD_REQUEST` | `OrderItem.create` 의 `quantity < 1` |
| 비즈니스 룰 위반 (재고 부족, 상태 위반) | `domain/<f>/*.model.ts` 메서드 | `CONFLICT` | `Product.decreaseStock` 의 `stock < quantity` |
| 리소스 없음 | `domain/<f>/*.service.ts` find / `infrastructure` repo find | `NOT_FOUND` | `OrderService.getOrder` 가 null 받았을 때 |
| 도메인 invariant 위반 (시스템 자체) | `domain/<f>/*.model.ts` 또는 `infrastructure` | `INTERNAL` | 잘못된 상태값 (`OrderStatus` 에 없는 값) |
| DB row 손상 (필수 필드 null) | `infrastructure/<f>/*.repository.impl.ts` `toModel` | `INTERNAL` | `productname === null` 등 |

## throw 패턴

```ts
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { <Feature>ErrorCode } from './<feature>-error-code';

// 1. 입력 검증 (도메인 model 의 create / 메서드)
if (props.quantity < 1) {
  throw new CoreException(
    ErrorType.BAD_REQUEST,
    <Feature>ErrorCode.QUANTITY_NOT_POSITIVE,
    { quantity: props.quantity },
  );
}

// 2. 비즈니스 룰 (도메인 메서드)
if (this.#stock < quantity) {
  throw new CoreException(
    ErrorType.CONFLICT,
    <Feature>ErrorCode.NOT_ENOUGH_STOCK,
    { productId: this.id, requested: quantity, available: this.#stock },
  );
}

// 3. 리소스 없음 (service 의 find)
async findById(id: number): Promise<<Feature>> {
  const model = await this.<feature>Repository.findById(id);
  if (!model) {
    throw new CoreException(
      ErrorType.NOT_FOUND,
      <Feature>ErrorCode.NOT_FOUND,
      { id },
    );
  }
  return model;
}

// 4. DB row 손상 (infrastructure toModel)
private static toModel(row: <Feature>Row): <Feature> {
  if (row.requiredField === null) {
    throw new CoreException(
      ErrorType.INTERNAL,
      <Feature>ErrorCode.CORRUPTED_ROW,
      { id: row.id },
    );
  }
  return <Feature>.restore({ /* ... */ });
}
```

## detail 객체 컨벤션

`detail` 은 *디버깅 + 클라이언트가 필요한 컨텍스트*. 너무 많이 넣지 말고:

좋은 예:
```ts
{ productId: 100, requested: 5, available: 1 }   // 재고 부족
{ id: 42 }                                        // 리소스 없음
{ orderNo: 'ORD-...' }                            // 키 정보
```

나쁜 예 (정보 너무 많음 / 보안 위험):
```ts
{ entireRow: row }                                // DB row 통째 — 정보 누출
{ password: 'X', token: 'Y' }                     // 민감 정보 (당연히 X)
{ stack: error.stack }                            // 스택 — 클라이언트에 노출 X
```

## 새 ErrorCode 추가하기

### Step 1. 어떤 도메인의 에러인가 결정

- `Product` 의 새 룰 → `product-error-code.ts`
- 여러 도메인 공통 (auth 등) → 새 도메인 추가하거나 `support/error/` 에 공통 코드 (현재는 없음)

### Step 2. `<feature>-error-code.ts` 에 항목 추가

```ts
// src/domain/product/product-error-code.ts
export const ProductErrorCode = {
  NOT_FOUND: { code: 'product.not-found', message: '...' },
  NOT_ENOUGH_STOCK: { code: 'product.not-enough-stock', message: '...' },
  // 새 항목:
  DISCOUNT_EXCEEDS_PRICE: {
    code: 'product.discount-exceeds-price',
    message: '할인 금액이 상품 가격을 초과할 수 없습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
```

### Step 3. throw 위치에서 사용

```ts
// src/domain/product/product.model.ts
applyDiscount(amount: number): void {
  if (amount > this.price) {
    throw new CoreException(
      ErrorType.CONFLICT,
      ProductErrorCode.DISCOUNT_EXCEEDS_PRICE,
      { amount, price: this.price, productId: this.id },
    );
  }
  // ...
}
```

### Step 4. 테스트 추가

```ts
// src/domain/product/product.model.spec.ts
it('할인이 가격을 초과하면 DISCOUNT_EXCEEDS_PRICE 예외를 던진다', () => {
  // given
  const product = aProduct({ price: 1_000 });
  // when
  const action = (): void => product.applyDiscount(2_000);
  // then
  expect(action).toThrow(
    expect.objectContaining({ errorCode: ProductErrorCode.DISCOUNT_EXCEEDS_PRICE }),
  );
});
```

또는 헬퍼 사용:
```ts
expectCoreException(() => product.applyDiscount(2_000), ProductErrorCode.DISCOUNT_EXCEEDS_PRICE);
```

## CORRUPTED_ROW 패턴 — 도메인 nullable 차단

Prisma 스키마가 비-PK 컬럼 다수를 nullable 로 정의 (`Int?`, `String?`). 도메인이 `| null` 을 안 신경쓰게, *infrastructure 의 `toModel` 에서* null 검증해 통과/차단.

```ts
// src/infrastructure/<feature>/<feature>.repository.impl.ts
private static toModel(row: <Feature>Row): <Feature> {
  // 도메인이 비-null로 가정하는 모든 필수 필드 검증
  if (
    row.productname === null ||
    row.price === null ||
    row.qty === null
  ) {
    throw new CoreException(
      ErrorType.INTERNAL,                          // 시스템 invariant 위반
      <Feature>ErrorCode.CORRUPTED_ROW,
      { id: row.id },
    );
  }
  return <Feature>.restore({
    id: row.id,
    name: row.productname,                          // ← 검증 후라 이미 string
    price: row.price,                               // ← number
    stock: row.qty,                                 // ← number
  });
}
```

이 패턴 덕분에 도메인 코드 어디에도 `!` non-null assertion 이 없다.

새 필드 추가 시 `toModel` 에 검증 *반드시* 추가 (잊으면 도메인까지 null 흘러감 → 다른 곳에서 터짐).

Integration 테스트로 회귀 잡기:
```ts
// test/integration/<feature>.repository.int-spec.ts
it('필수 필드(<field>)가 null인 손상된 row는 CORRUPTED_ROW 예외를 던진다', async () => {
  const corruptedRow = await testEnv.prisma.<feature>.create({
    data: a<Feature>Row({ <field>: null }),
  });
  await expectCoreExceptionAsync(
    () => repository.findById(corruptedRow.id),
    <Feature>ErrorCode.CORRUPTED_ROW,
  );
});
```

## 응답 봉투

성공:
```json
{ "meta": { "result": "SUCCESS" }, "data": { /* T */ } }
```

`controller` 에서 `ApiResponse.success(data)` 또는 `ApiResponse.empty()` (void).

실패: `CoreException` → Nest 의 기본 예외 필터가 자동 변환:
```json
{
  "statusCode": 409,
  "type": "error.conflict",
  "code": "product.not-enough-stock",
  "message": "재고가 부족합니다.",
  "detail": { "productId": 100, "requested": 5, "available": 1 }
}
```

E2E 테스트에서 양쪽 검증:
```ts
const response = await request(testApp.app.getHttpServer())
  .post('/api/v1/orders')
  .send(body)
  .expect(409);

expect(response.body).toMatchObject({ code: 'product.not-enough-stock' });
```

## 흔한 실수

1. **`throw new Error(...)`** — ESLint 가 잡지 않지만 컨벤션 위반. 항상 `CoreException`
2. **`throw new HttpException(...)` / `NotFoundException`** — Nest 표준 exception 직접 사용 X. `CoreException` 으로 통일
3. **ErrorType / ErrorCode 잘못 매칭** — 입력 검증을 `CONFLICT` 로 (X). 비즈니스 룰을 `BAD_REQUEST` 로 (X). 결정 트리 따라
4. **detail 에 너무 많은 정보** — 행 통째 / stack / 민감 데이터 X. 키 식별자 + 비교 값만
5. **`toModel` 에 새 필드 검증 누락** — 새 필드 추가 후 null 검증 안 더하면 도메인까지 null 흘러감
6. **`CORRUPTED_ROW` 검증 테스트 안 씀** — Integration spec 에 *반드시* 손상 row 케이스 추가
7. **`<feature>-error-code.ts` 에 추가 안 하고 인라인 메시지** — 모든 에러는 enum-like 맵에서 (재사용 + 검색성)
