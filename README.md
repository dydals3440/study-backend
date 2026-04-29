# Commerce

NestJS 11 + Prisma 7 기반의 4-Layer 헥사고날 아키텍처 커머스 API. Spring/Kotlin 진영의 hexagonal 구조를 NestJS-idiomatic하게 포팅한 학습·실험 프로젝트입니다.

> 도메인 모델·서비스·레포지토리 분리, 의존성 역전, 트랜잭션 경계, 타입 안전, 변경에 유연한 테스트 — *시니어 코드베이스의 토대*가 어떻게 짜여 있는지를 보여주는 예제 수준입니다.

## 목차

- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [아키텍처](#아키텍처)
  - [4-Layer 헥사고날](#4-layer-헥사고날)
  - [디렉토리](#디렉토리)
  - [5단계 데이터 변환 흐름](#5단계-데이터-변환-흐름)
  - [명명 규칙](#명명-규칙)
  - [핵심 설계 패턴 7](#핵심-설계-패턴-7)
- [테스트](#테스트)
  - [테스트 피라미드](#테스트-피라미드)
  - [실행](#실행)
  - [변경에 유연한 빌더 패턴](#변경에-유연한-빌더-패턴)
  - [타입 안전 헬퍼](#타입-안전-헬퍼)
  - [한국어 BDD 명세](#한국어-bdd-명세)
- [API](#api)
- [DB](#db)
- [모든 스크립트](#모든-스크립트)
- [의도적 미포함 (Out of Scope)](#의도적-미포함-out-of-scope)

## 기술 스택

| 영역 | 라이브러리 / 도구 |
|---|---|
| 프레임워크 | NestJS 11 (Express adapter) |
| 언어 | TypeScript 5.7 — `strictNullChecks`, `noImplicitAny`, `strictBindCallApply` |
| ORM | Prisma 7 — `prisma-client` 제너레이터, MariaDB 어댑터, MySQL 데이터소스 |
| 검증 / 변환 | class-validator, class-transformer + 글로벌 `ValidationPipe({ transform: true })` |
| API 문서 | @nestjs/swagger — OpenAPI 3 자동 생성, `/docs`에서 Swagger UI |
| 테스트 (러너) | Jest 30 + ts-jest |
| 테스트 (모킹) | @golevelup/ts-jest — `createMock<T>()` typed mock |
| 테스트 (DB) | @testcontainers/mysql — 격리된 MySQL 8.0 컨테이너 |
| 테스트 (HTTP) | supertest |
| 테스트 (fixture) | @faker-js/faker |
| 인프라 (로컬) | Docker Compose — MySQL 8.0 |
| 패키지 매니저 | pnpm |

## 시작하기

### 사전 요구사항

- Node.js ≥ 22 (Prisma 7의 dynamic WASM import 때문에 22+ 권장)
- pnpm 10+
- Docker (로컬 DB + integration/E2E 테스트의 testcontainers)

### 설치 및 실행

```bash
# 1. 의존성 설치 (postinstall이 prisma generate 자동 수행)
pnpm install

# 2. 로컬 MySQL 띄우기
pnpm db:up

# 3. 스키마 동기화 (최초 또는 schema 변경 시)
pnpm prisma:migrate

# 4. 개발 서버 (watch 모드)
pnpm start:dev
```

부팅 후:

- **REST API** — http://localhost:3000/api/v1/...
- **Swagger UI** — http://localhost:3000/docs

## 아키텍처

### 4-Layer 헥사고날

```
interfaces ──→ application ──→ domain ←── infrastructure
                                  ↑
                       (도메인이 Port 정의,
                        infrastructure가 구현)
```

`domain` 이 모든 의존의 끝점. 외부 라이브러리 (Prisma, Nest, Swagger 등) 는 `interfaces` / `application` / `infrastructure` 에만 흐르고, `domain` 은 순수 TypeScript + `support/error` 만 import. 의존성 역전은 *Repository* 가 담당 — domain 의 추상 클래스를 infrastructure 가 구현해 NestJS DI 가 바인딩한다.

### 디렉토리

```
src/
├── main.ts                       글로벌 prefix /api + URI 버저닝 + ValidationPipe + Swagger UI
├── app.module.ts                 루트 모듈
│
├── modules/                      도메인 비의존, 재사용 인프라 설정
│   └── prisma/                       PrismaService + @Global PrismaModule
│
├── support/                      부가 기능 (add-ons)
│   └── error/                        CoreException + ErrorType + ErrorCode
│
├── interfaces/api/               Inbound Adapter (HTTP)
│   ├── api-response.ts                     ApiResponse<T> 봉투
│   ├── api-success-response.decorator.ts   @ApiSuccessResponse / @ApiSuccessEmptyResponse
│   └── <feature>/
│       ├── <feature>-v1.api-spec.ts        TS 인터페이스 (타입 컨트랙트)
│       ├── <feature>-v1.controller.ts      @RestController, @ApiTags, @ApiOperation
│       └── <feature>-v1.dto.ts             Request / Response (flat export)
│
├── application/                  Use Case Orchestration (Facade)
│   └── <feature>/
│       ├── <feature>.module.ts                 NestJS 모듈 (composition root)
│       ├── <feature>.facade.ts                 트랜잭션 경계 + 오케스트레이션
│       └── <feature>.info.ts                   응용 결과 객체 (Domain → Info)
│
├── domain/                       Pure Domain (Hexagon 중심)
│   └── <feature>/
│       ├── <feature>.model.ts                  엔티티 (행위 보유)
│       ├── <feature>.repository.ts             추상 클래스 (Port, DI 토큰)
│       ├── <feature>.service.ts                도메인 서비스
│       ├── <feature>.command.ts                도메인 명령 객체
│       └── <feature>-error-code.ts             도메인 에러 코드 맵
│
└── infrastructure/               Outbound Adapter (DB)
    └── <feature>/
        └── <feature>.repository.impl.ts        Repository 포트 구현 (PrismaService 사용)
```

`order` 도메인은 추가로 `order-item.model.ts` (자식 엔티티) 와 `order-status.ts` (상태 enum) 를 가진다.

### 5단계 데이터 변환 흐름

같은 정보 (예: 주문) 를 표현하는 객체가 5개, 각자 다른 레이어에 살고, **변환은 항상 *받는 쪽 레이어* 가 책임진다.**

```
HTTP body (JSON)
   ↓ Nest body parser + ValidationPipe + class-transformer
CreateOrderRequest                          ← interfaces 소유
   ↓ request.toCommand()                    ← interfaces 책임
CreateOrderCommand                          ← domain 소유
   ↓ orderFacade.createOrder(command)
Order (model, w/ behavior)                  ← domain 소유
   ↓ OrderInfo.from(model)                  ← application 책임
OrderInfo                                   ← application 소유
   ↓ OrderResponse.from(info)               ← interfaces 책임
OrderResponse                               ← interfaces 소유
   ↓ ApiResponse.success(...)
HTTP response (JSON envelope)
```

| 객체 | 위치 | 역할 |
|---|---|---|
| `CreateOrderRequest` | `interfaces/api/order/order-v1.dto.ts` | HTTP 요청 본문 + Swagger 스키마 |
| `CreateOrderCommand` | `domain/order/order.command.ts` | 도메인이 받는 명령 |
| `Order` (model) | `domain/order/order.model.ts` | 영속화 도메인 객체, 비즈니스 행위 보유 |
| `OrderInfo` | `application/order/order.info.ts` | 응용 레이어 결과 |
| `OrderResponse` | `interfaces/api/order/order-v1.dto.ts` | HTTP 응답 본문 |

각 변환은 **한 단계씩만** 건너뛰고, 도메인 모델은 application 위쪽으로 새지 않는다 (`OrderInfo.from(model)` 이 보호막).

### 명명 규칙

| 규칙 | 예시 |
|---|---|
| 파일은 kebab-case | `order-v1.controller.ts`, `order-item.model.ts` |
| 클래스는 PascalCase, 파일명과 1:1 | `order-v1.controller.ts` ↔ `OrderV1Controller` |
| **API 버전은 HTTP 레이어에만** | `OrderV1Controller`, `OrderV1ApiSpec`. 도메인/인프라/응용은 무버전 |
| **Flat export, 한 파일에 여러 클래스** | `order-v1.dto.ts` 안에 `CreateOrderRequest`, `OrderItemRequest`, `OrderResponse`, `OrderItemResponse` 평면 export (namespace 안 씀) |
| 클래스명에 도메인 prefix | `CreateOrderRequest`, `CreateOrderCommand`, `OrderItemInfo`, `AddCartItemCommand` |
| 모델 클래스명은 도메인명 그대로 | `Order`, `OrderItem`, `Product`, `Cart` (`*Model` 접미사 없음) |
| Repository는 추상/구현 분리 | `OrderRepository` (domain) ↔ `OrderRepositoryImpl` (infrastructure) |
| 도메인마다 자기 에러 코드 맵 | `OrderErrorCode`, `CartErrorCode`, `ProductErrorCode` |
| 변환 메서드는 받는 쪽이 소유 | `request.toCommand()` (interfaces), `OrderInfo.from(model)` (application), `OrderResponse.from(info)` (interfaces) |
| **`!` non-null assertion 금지** | ESLint `no-non-null-assertion: error`. 좁히기는 `expectNotNull` 헬퍼 |

### 핵심 설계 패턴 7

#### 1. Outer class (`OrderV1Dto.CreateRequest`) → flat export

TS의 모듈 시스템에서는 *파일이 이미 묶음 단위*. namespace 를 추가로 끼우면 ESLint 기본 룰 (`no-namespace`) 충돌 + `@Type(() => Foo.Bar)` 같은 forward-reference 우회 + Swagger/class-transformer 동작이 미묘하게 꼬임. 클래스명에 도메인 prefix 를 박아 모호성을 회피.

```ts
// order-v1.dto.ts
export class OrderItemRequest {
  @IsInt() @ApiProperty() productId: number;
  @IsInt() @ApiProperty() quantity: number;
}

export class CreateOrderRequest {
  @IsInt() @ApiProperty() customerId: number;

  @IsArray() @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  @ApiProperty({ type: () => OrderItemRequest, isArray: true })
  items: OrderItemRequest[];

  toCommand(): CreateOrderCommand { /* ... */ }
}

export class OrderResponse {
  /* ... static from(info: OrderInfo) ... */
}
```

#### 2. Enum → `as const` + `keyof typeof`

TS native `enum` 대신:

```ts
export const OrderStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

에러 코드 맵도 같은 패턴 (값은 `{code, message}`):

```ts
export const OrderErrorCode = {
  NOT_FOUND: { code: 'order.not-found', message: '주문을 찾을 수 없습니다.' },
  ITEMS_EMPTY: { code: 'order.items.empty', message: '주문 항목은 비어있을 수 없습니다.' },
} as const satisfies Record<string, ErrorCode>;
export type OrderErrorCode = (typeof OrderErrorCode)[keyof typeof OrderErrorCode];
```

#### 3. 에러 모델 — `CoreException(errorType, errorCode, detail?)`

`ErrorType` 이 HTTP status 매핑, `ErrorCode` 가 도메인 specific.

```ts
throw new CoreException(
  ErrorType.NOT_FOUND,
  OrderErrorCode.NOT_FOUND,
  { id: orderId },
);
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

#### 4. 응답 봉투 — `ApiResponse<T>`

성공 응답은 항상 메타 + 데이터 봉투:

```json
{ "meta": { "result": "SUCCESS" }, "data": { /* T */ } }
```

Swagger 스키마 합성용 헬퍼: `@ApiSuccessResponse(OrderResponse)`, `@ApiSuccessResponse(CartItemResponse, { isArray: true })`, `@ApiSuccessEmptyResponse()`.

#### 5. Repository — 추상 클래스 (DI 토큰)

TS interface 는 런타임 메타데이터가 없어 NestJS DI 토큰으로 못 씀. 추상 클래스가 *토큰 + 인터페이스* 양쪽을 만족.

```ts
// domain/order/order.repository.ts
export abstract class OrderRepository {
  abstract findById(id: number, tx?: Prisma.TransactionClient): Promise<Order | null>;
  abstract save(order: Order, tx?: Prisma.TransactionClient): Promise<Order>;
}

// application/order/order.module.ts
@Module({
  providers: [
    OrderFacade,
    OrderService,
    { provide: OrderRepository, useClass: OrderRepositoryImpl },
  ],
})
export class OrderModule {}
```

#### 6. 트랜잭션 — Facade 가 경계

NestJS 는 Spring `@Transactional` 자동 wrapping 이 없음. **Facade 가 `prisma.$transaction(...)` 으로 경계를 잡고**, `Prisma.TransactionClient` 를 service → repository 로 명시적 전파.

```ts
async createOrder(command: CreateOrderCommand): Promise<OrderInfo> {
  const order = await this.prisma.$transaction(async (tx) => {
    return this.orderService.createOrder(command.customerId, command.items, tx);
  });
  return OrderInfo.from(order);
}
```

#### 7. 도메인의 nullable 차단

Prisma 스키마가 비-PK 컬럼을 거의 모두 nullable 로 정의 (`Int?`, `String?`). 도메인이 `| null` 을 신경쓰지 않게, **infrastructure repository 의 `toModel(row)` 가 null 검증 후 통과시킴**.

```ts
private static toModel(row: ProductRow): Product {
  if (row.productname === null || row.price === null || row.qty === null) {
    throw new CoreException(
      ErrorType.INTERNAL,
      ProductErrorCode.CORRUPTED_ROW,
      { id: row.id },
    );
  }
  return Product.restore({
    id: row.id, name: row.productname, price: row.price, stock: row.qty,
  });
}
```

이 패턴 덕분에 도메인 코드 어디에도 `!` non-null assertion 이 없다.

## 테스트

총 **90개 테스트** (Unit 60 / Integration 15 / E2E 15).

### 테스트 피라미드

| 종류 | 위치 | 외부 의존 | 속도 | 검증 대상 |
|---|---|---|---|---|
| **Unit** | `src/**/*.spec.ts` | 없음 (mocked) | <5초 | 도메인 비즈니스 규칙, 경계값, 불변성, Service / Facade 위임 |
| **Integration** | `test/integration/*.int-spec.ts` | testcontainers MySQL | ~25초 | Prisma 쿼리, row → 도메인 매핑, CORRUPTED_ROW 차단 |
| **E2E** | `test/e2e/*.e2e-spec.ts` | testcontainers + 풀 NestJS 앱 | ~20초 | HTTP 응답 봉투 + DB side effect (트랜잭션 롤백 검증) |

각 레이어의 테스트 분담:

| 레이어 | 테스트 종류 | 케이스 수 |
|---|---|---|
| `domain/<feature>/*.model.ts` | Unit (성공·경계·실패·불변성) | 33 |
| `domain/<feature>/*.service.ts` | Unit (mocked Repository) | 16 |
| `application/<feature>/*.facade.ts` | Unit (mocked Service / PrismaService) | 11 |
| `infrastructure/<feature>/*.repository.impl.ts` | Integration | 15 |
| `interfaces/api/<feature>/*.controller.ts` | E2E (해피 패스 + 실패 + 트랜잭션 롤백) | 15 |

### 실행

```bash
pnpm test           # Unit only — TDD 사이클 빠르게
pnpm test:watch     # Unit watch 모드
pnpm test:cov       # Unit + 커버리지
pnpm test:int       # Integration (Docker 필요, --runInBand)
pnpm test:e2e       # E2E (Docker 필요, --runInBand)
pnpm test:ci        # 전부 (test:cov && test:int && test:e2e)
```

> **`test:int` / `test:e2e` 는 `NODE_OPTIONS='--experimental-vm-modules'` 자동 적용.** Prisma 7 의 WASM query compiler 가 dynamic import 를 사용하기 때문.
>
> testcontainers 가 컨테이너를 공유하므로 **반드시 `--runInBand`** (병렬이면 포트 충돌).

### 변경에 유연한 빌더 패턴

도메인 엔티티에 필드가 추가될 때 *한 곳만 고치고* 나머지 테스트는 자동으로 새 default 를 받게 하는 게 핵심.

#### 패턴 A — Factory + `Partial<Parameters<typeof X>[0]>` (단순 엔티티)

원본 시그니처에서 *타입을 끌어와* `Partial` 로 override 만 받음.

```ts
// test/support/builders/product.builder.ts
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

`Product.restore` 에 `category: string` 필드가 추가되면:
1. spread literal 에서 TS 컴파일 에러 발생
2. factory 에 `category: faker.commerce.department()` 한 줄 추가
3. 기존 테스트는 그대로 통과 — faker 가 사실적 default 채워줌

#### 패턴 B — Builder 클래스 (자식 가진 aggregate)

`Order` 처럼 `OrderItem[]` 을 가진 aggregate 은 fluent builder.

```ts
// test/support/builders/order.builder.ts
const order = anOrder()
  .withCustomerId(42)
  .withItem(anOrderItem({ price: 5_000, quantity: 2 }))
  .withItem(anOrderItem({ price: 3_000, quantity: 1 }))
  .build();
```

자식을 누적하며 합계 자동 계산 → 테스트 코드가 *시나리오의 의도* 만 표현.

### 타입 안전 헬퍼

#### `createMock<T>()` — typed mock

수동 `jest.fn()` 깡끄기 X. `@golevelup/ts-jest` 가 추상 클래스 시그니처에서 자동 생성.

```ts
import { createMock, DeepMocked } from '@golevelup/ts-jest';

let productRepository: DeepMocked<ProductRepository>;

beforeEach(() => {
  productRepository = createMock<ProductRepository>();
});

// mockResolvedValue 가 ProductRepository.findByIdForUpdate 의
// 반환 타입(Promise<Product | null>)을 *컴파일 타임에* 강제
productRepository.findByIdForUpdate.mockResolvedValue(aProduct({ stock: 5 }));
```

Repository 시그니처 변경 → 모든 mock 호출에 컴파일 에러 → 정확한 위치 알려줌.

#### `expectNotNull` — `!` 없는 narrowing

```ts
// test/support/expect-helpers.ts
export function expectNotNull<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`expected non-null/undefined, got: ${String(value)}`);
  }
}

// 사용:
const product = await repository.findByIdForUpdate(id);
expectNotNull(product);          // 이 줄 이후 product 는 Product (not null)
expect(product.stock).toBe(10);  // ! 없이 깔끔
```

`expect(x).not.toBeNull()` 은 jest matcher 라 TS 타입을 좁혀주지 않음 — 위 헬퍼가 *진짜* asserting function.

### 한국어 BDD 명세

`describe` / `it` 모두 한국어, `// given / when / then` 코멘트로 구조화. 한 메서드마다 *성공·경계·실패·불변성* 6 카테고리를 빠짐없이 커버.

```ts
describe('Product 도메인 모델', () => {
  describe('decreaseStock — 재고 차감', () => {
    describe('성공 케이스', () => {
      it('재고가 충분하면 요청 수량만큼 차감된다', () => { /* ... */ });
      it('재고와 정확히 같은 수량을 차감하면 재고가 0이 된다', () => { /* ... */ });
      it('연속으로 차감하면 누적되어 줄어든다', () => { /* ... */ });
    });

    describe('실패 케이스', () => {
      it('재고보다 많은 수량을 차감하려고 하면 NOT_ENOUGH_STOCK 예외를 던진다', () => { /* ... */ });
      it.each([0, -1, -100])('차감 수량이 %i 처럼 1 미만이면 QUANTITY_NOT_POSITIVE 예외를 던진다', /* ... */);
    });

    describe('불변성', () => {
      it('재고 부족으로 예외가 발생하면 재고 값은 변경되지 않는다', () => { /* ... */ });
    });
  });
});
```

E2E 는 **HTTP 응답 + DB side effect 동시 검증** + **트랜잭션 롤백 명시적 검증**:

```ts
it('재고 부족이면 409 + product.not-enough-stock 코드, 트랜잭션 롤백', async () => {
  // given - 재고 1개 짜리 상품
  const lowStockProduct = await testApp.prisma.product.create({ data: aProductRow({ qty: 1 }) });

  // when
  const response = await request(testApp.app.getHttpServer())
    .post('/api/v1/orders')
    .send(buildCreateOrderRequest({ items: [{ productId: lowStockProduct.id, quantity: 5 }] }))
    .expect(409);

  // then - 응답 + DB 상태 둘 다 검증
  expect(response.body).toMatchObject({ code: 'product.not-enough-stock' });
  const productAfter = await testApp.prisma.product.findUnique({ where: { id: lowStockProduct.id } });
  expect(productAfter?.qty).toBe(1);  // 변동 없음
  expect(await testApp.prisma.order.findMany()).toHaveLength(0);
});
```

## API

### 라우팅

- 글로벌 prefix `/api` + URI 버저닝 → 실제 경로는 `/api/v1/<resource>`
- 모든 path 는 복수형 (`carts`, `orders`, `products`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/products/:id` | 상품 단건 조회 |
| POST | `/api/v1/carts` | 장바구니 항목 추가 |
| GET | `/api/v1/carts/:customerId` | 장바구니 조회 |
| DELETE | `/api/v1/carts/:customerId` | 장바구니 비우기 |
| POST | `/api/v1/orders` | 주문 생성 (재고 락 + 차감 + 주문/디테일 영속화) |
| GET | `/api/v1/orders/:orderId` | 주문 단건 조회 |

### Swagger UI

전체 스펙 + 시도해 보기는 http://localhost:3000/docs (서버 부팅 후).

## DB

`prisma/schema.prisma` — `cart`, `order`, `ordersDetail`, `product` 4개 테이블. 비-PK 컬럼이 모두 nullable 한 레거시 스키마이지만, 도메인 진입 시점 (`toModel`) 에서 차단.

```bash
pnpm db:up           # docker-compose mysql up
pnpm db:down         # mysql down
pnpm db:reset        # 볼륨 포함 재생성
pnpm db:logs         # mysql 로그 follow
pnpm db:cli          # mysql shell

pnpm prisma:generate # 클라이언트 재생성 (postinstall에서도 실행)
pnpm prisma:migrate  # dev 마이그레이션
pnpm prisma:studio   # Prisma Studio
pnpm prisma:format   # schema.prisma 포맷
```

## 폴더별 변경 빈도

| 레이어 | 변경 빈도 | 변경 이유 |
|---|---|---|
| `interfaces/api/` | 자주 | API 스펙 변경, DTO 필드 추가 |
| `application/` | 보통 | 유스케이스 흐름 변경, 후속 처리 |
| `domain/` | 드뭄 | 비즈니스 규칙 변경 (가장 안정) |
| `infrastructure/` | 드뭄 | DB 스키마/쿼리 튜닝, 어댑터 교체 |

이 분량이 정당화되는 이유: **변경 이유가 다른 코드가 다른 자리에 있다.**

## 모든 스크립트

| Script | 설명 |
|---|---|
| `pnpm start` | production 모드 실행 (build 후) |
| `pnpm start:dev` | watch 모드 개발 서버 |
| `pnpm start:debug` | --debug --watch |
| `pnpm start:prod` | `node dist/main` |
| `pnpm build` | `dist/` 로 컴파일 |
| `pnpm format` | Prettier — `src/`, `test/` |
| `pnpm lint` | ESLint + auto-fix |
| `pnpm test` | Unit only (`test/jest.unit.json`) |
| `pnpm test:watch` | Unit watch |
| `pnpm test:cov` | Unit + 커버리지 |
| `pnpm test:int` | Integration (testcontainers, --runInBand) |
| `pnpm test:e2e` | E2E (testcontainers + NestJS 앱, --runInBand) |
| `pnpm test:ci` | 전체 (cov + int + e2e) — CI 용 |
| `pnpm test:debug` | --inspect-brk 로 unit 디버깅 |
| `pnpm db:up` | docker-compose mysql up |
| `pnpm db:down` | mysql down |
| `pnpm db:reset` | 볼륨 포함 재생성 |
| `pnpm db:logs` | mysql 로그 follow |
| `pnpm db:cli` | mysql shell |
| `pnpm prisma:pull` | DB → schema.prisma |
| `pnpm prisma:generate` | 클라이언트 재생성 (postinstall) |
| `pnpm prisma:studio` | Prisma Studio |
| `pnpm prisma:format` | schema.prisma 포맷 |
| `pnpm prisma:migrate` | dev 마이그레이션 |
| `pnpm prisma:deploy` | production 마이그레이션 |

## 의도적 미포함 (Out of Scope)

레퍼런스에는 있지만 본 프로젝트 현재 범위 밖. use case 가 생기면 추가 예정.

| 항목 | 메모 |
|---|---|
| **Auth / Session** | `customerId` 가 body 로 들어옴. JWT + `@CurrentMemberId` 데코레이터는 미구현 |
| **Idempotency** | `POST /orders` 가 두 번 호출되면 두 주문 생성. `Idempotency-Key` 헤더 필요 |
| **`@nestjs/event-emitter`** | `OrderCreatedEvent` / `@TransactionalEventListener(AFTER_COMMIT)` 미적용 |
| **Outbox / Kafka** | 외부 시스템 트랜잭셔널 전파 미구현 |
| **Coupon / Queue / Ranking** | `Order.applyDiscount`, `Order.cancel` 메서드만 존재 (use case 미연동) |
| **분산락 / 낙관적 락** | 현재 `SELECT ... FOR UPDATE` 만. 고동시성 시 lock contention 해소 안 함 |
| **부하 / 동시성 회귀 테스트** | k6, `Promise.all` 기반 race condition 검증 미작성 |
| **Mutation testing (Stryker)** | 도메인 코드만 한정해 도입 가치 있음, 미적용 |
| **Contract testing (Pact)** | 단일 앱이라 over-engineering. 클라이언트 분리 시 도입 |
| **관찰성** | 구조화 로그, OpenTelemetry, Prometheus 미구성 |
| **운영 베이직** | `/health`, graceful shutdown, rate limiting 미구현 |
| **Swagger 데코레이터의 `*-v1.api-spec.ts` 자동 적용** | NestJS 는 interface 가 런타임 메타데이터를 못 가져 데코레이터를 컨트롤러에 직접 붙임. api-spec 파일은 TS-레벨 타입 컨트랙트 용도로 유지 |

## License

UNLICENSED (private).
