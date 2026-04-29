---
name: adding-endpoint
description: Use when adding a new HTTP route (POST/GET/PUT/DELETE) to an existing feature. Walks the request through the 4 layers from interfaces inward, identifying which layers actually need new code and which just delegate. Stops over-modification.
---

# Adding an Endpoint

기존 feature(`cart`, `order`, `product`) 에 새 라우트를 추가할 때. 신규 *기능 자체* 추가는 아님 (그건 `creating-feature`).

## When to Use

- 기존 `<feature>` 에 새 HTTP 메서드/path 추가 (예: `PATCH /api/v1/products/:id/price`)
- 기존 use case 의 응답 shape 만 변경 — 이때는 `Info` + `Response` 만 수정

## 영향 범위 결정 트리

새 라우트가 *얼마나 깊게* 영향 주는가? 안쪽부터 따져본다.

```
새 DB 쿼리가 필요한가?
├── YES → repository abstract + impl 에 메서드 추가
└── NO ──┐
         새 도메인 행위/규칙이 있는가?
         ├── YES → domain service 또는 model 메서드 추가
         └── NO ──┐
                  새 use case (트랜잭션 또는 여러 service 조합)?
                  ├── YES → facade 메서드 추가
                  └── NO → controller + dto 만 추가 (단순 위임)
```

대부분의 신규 엔드포인트는 controller + dto + facade 까지만 건드리고 끝남.

## 작성 순서 (안쪽 → 바깥쪽)

```
1. (필요 시) domain/<f>/<f>.model.ts    — 새 행위 메서드
2. (필요 시) domain/<f>/<f>.repository.ts + infrastructure/<f>/<f>.repository.impl.ts
3. (필요 시) domain/<f>/<f>.command.ts   — 새 명령 객체
4. (필요 시) domain/<f>/<f>.service.ts   — 새 도메인 use case
5. application/<f>/<f>.facade.ts         — 새 facade 메서드 (트랜잭션 경계)
6. application/<f>/<f>.info.ts           — (응답 shape 변경 시)
7. interfaces/api/<f>/<f>-v1.dto.ts      — Request (with toCommand) + Response
8. interfaces/api/<f>/<f>-v1.api-spec.ts — 인터페이스에 메서드 시그니처 추가
9. interfaces/api/<f>/<f>-v1.controller.ts — 라우트 핸들러 추가
10. test                                 — E2E 필수, Unit 도 추가 (신규 도메인 행위라면)
```

## 단계별 디테일

### 1. Repository 메서드 추가 (필요 시)

> 참고: `src/domain/order/order.repository.ts`, `src/infrastructure/order/order.repository.impl.ts`

domain abstract:
```ts
// src/domain/<feature>/<feature>.repository.ts
export abstract class <Feature>Repository {
  // 기존 메서드들...
  abstract findByCustomerId(customerId: number, tx?: Prisma.TransactionClient): Promise<<Feature>[]>;  // 추가
}
```

infrastructure impl:
```ts
// src/infrastructure/<feature>/<feature>.repository.impl.ts
async findByCustomerId(customerId: number, tx: Prisma.TransactionClient = this.prisma): Promise<<Feature>[]> {
  const rows = await tx.<feature>.findMany({ where: { customer_id: customerId } });
  return rows.map((row) => <Feature>RepositoryImpl.toModel(row));
}
```

### 2. Domain service / model method (필요 시)

> 참고: `src/domain/order/order.service.ts`

새 도메인 행위 (예: 재고 차감, 할인 적용)는 *model 의 메서드*. 여러 단계 조합 (락 → 검증 → 저장)은 *service 의 메서드*.

### 3. Facade 메서드 추가

> 참고: `src/application/order/order.facade.ts`

```ts
// 트랜잭션 필요 시
async updateSomething(command: UpdateSomethingCommand): Promise<<Feature>Info> {
  const updated = await this.prisma.$transaction(async (tx) => {
    return this.<feature>Service.doSomething(command, tx);
  });
  return <Feature>Info.from(updated);
}

// 트랜잭션 불필요 (단순 조회 등)
async findById(id: number): Promise<<Feature>Info> {
  const model = await this.<feature>Service.findById(id);
  return <Feature>Info.from(model);
}
```

### 4. DTO 추가 (Request + Response)

> 참고: `src/interfaces/api/order/order-v1.dto.ts`

```ts
// src/interfaces/api/<feature>/<feature>-v1.dto.ts (기존 파일에 추가)

export class UpdateSomethingRequest {
  @IsInt() @ApiProperty() someId: number;
  @IsString() @ApiProperty() value: string;

  toCommand(): UpdateSomethingCommand {
    return new UpdateSomethingCommand({ someId: this.someId, value: this.value });
  }
}
```

> Request DTO 에 `@IsInt()`, `@IsString()`, `@ValidateNested()` 등 *반드시 부착*. 없으면 ValidationPipe 가 누락 필드를 못 잡아냄 → 잘못된 입력이 도메인까지 흘러감.

배열을 받으면:
```ts
@IsArray() @ValidateNested({ each: true })
@Type(() => SomeItemRequest)
@ApiProperty({ type: () => SomeItemRequest, isArray: true })
items: SomeItemRequest[];
```

### 5. Api-spec 업데이트

> 참고: `src/interfaces/api/order/order-v1.api-spec.ts`

```ts
export interface <Feature>V1ApiSpec {
  // 기존 메서드들...
  updateSomething(request: UpdateSomethingRequest): Promise<ApiResponse<<Feature>Response>>;
}
```

### 6. Controller 핸들러 추가

> 참고: `src/interfaces/api/order/order-v1.controller.ts`

```ts
@Patch(':id/something')
@ApiOperation({ summary: '...' })
@ApiParam({ name: 'id', type: 'integer' })
@ApiSuccessResponse(<Feature>Response)
async updateSomething(
  @Param('id', ParseIntPipe) id: number,
  @Body() request: UpdateSomethingRequest,
): Promise<ApiResponse<<Feature>Response>> {
  const info = await this.<feature>Facade.updateSomething(request.toCommand());
  return ApiResponse.success(<Feature>Response.from(info));
}
```

응답 형식 별 데코레이터:
| 응답 | 데코레이터 |
|---|---|
| 단일 객체 | `@ApiSuccessResponse(<Feature>Response)` |
| 배열 | `@ApiSuccessResponse(<Feature>Response, { isArray: true })` |
| 빈 응답 (DELETE 등) | `@ApiSuccessEmptyResponse()` |

### 7. 테스트 추가

`writing-tests` skill 참조. 최소:

- **E2E 필수** — 신규 라우트는 *반드시* `test/e2e/<feature>s.e2e-spec.ts` 에 케이스 추가 (성공 + 실패 + DB side effect)
- **Unit 추가** — 신규 도메인 행위 (model 메서드, service 메서드, facade 메서드) 가 있다면 해당 spec 에 케이스 추가

E2E 패턴 (참고: `test/e2e/orders.e2e-spec.ts`):
```ts
describe('PATCH /api/v1/<feature>s/:id/something', () => {
  describe('성공 케이스', () => {
    it('정상 입력이면 200 + 응답 + DB side effect', async () => {
      // given - DB 상태
      // when - HTTP 요청
      // then - 응답 봉투 + DB 변경 검증
    });
  });
  describe('실패 케이스', () => {
    it('필드 누락이면 400 (ValidationPipe)', async () => { /* ... */ });
    it('존재하지 않는 ID면 404', async () => { /* ... */ });
    // ... 비즈니스 룰 위반
  });
});
```

## 검증

```bash
pnpm tsc --noEmit
pnpm test                  # 도메인 변경이 있다면
pnpm test:e2e              # 새 라우트
pnpm lint
```

Swagger UI (`/docs`) 에서 새 라우트가 정확한 schema 로 노출되는지 확인.

## 흔한 실수

1. **DTO 에 validation decorator 안 붙임** — `@IsInt()` 누락 → ValidationPipe 가 통과시킴 → 도메인까지 잘못된 데이터 흘러감
2. **`toCommand()` 안 만듦** — controller 가 직접 service 호출 → interfaces ↔ domain 책임 분리 깨짐
3. **트랜잭션 경계 잘못 잡음** — service 안에서 `prisma.$transaction` 호출 (X). Facade 가 잡고 tx를 service 로 내려주는 게 컨벤션
4. **Repository 추가 시 abstract 만 / impl 만** — 둘 다 변경해야 컴파일 + 런타임 모두 일관
5. **`@ApiOperation`, `@ApiSuccessResponse` 누락** — Swagger 문서가 비어있게 됨
6. **path 가 복수형 아님** — `@Controller({ path: '<feature>' })` → `<feature>s` 로 (모든 도메인 path 는 복수)
7. **E2E 안 씀** — Unit 만으로는 wiring (모듈 등록, DI 바인딩, validation pipe) 검증 안 됨
