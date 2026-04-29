# Project Memory — Commerce

NestJS 11 + Prisma 7 기반 4-Layer 헥사고날 아키텍처 커머스 API. *모든 변경 작업은 이 문서의 규칙을 따른다*.

## 아키텍처 한눈에

```
interfaces ──→ application ──→ domain ←── infrastructure
                                  ↑
                       (도메인이 Port 정의,
                        infrastructure가 구현)
```

`domain`이 의존의 끝점. 외부 라이브러리 (Prisma, Nest, Swagger 등)는 `interfaces` / `application` / `infrastructure` 에만 흐르고, `domain` 은 순수 TypeScript + `support/error` 만 import.

## 디렉토리 cheat sheet

```
src/
├── interfaces/api/<feature>/      HTTP — controller, dto, api-spec (V1 prefix 여기만)
├── application/<feature>/         Use case — facade, info, module (트랜잭션 경계)
├── domain/<feature>/              Pure domain — model, service, repository(abstract), command, error-code
├── infrastructure/<feature>/      Outbound adapter — repository.impl.ts (PrismaService 사용)
├── modules/prisma/                @Global PrismaModule
└── support/error/                 CoreException + ErrorType + ErrorCode
```

`order` 도메인은 추가로 `order-item.model.ts` (자식 엔티티) + `order-status.ts` (enum).

## 5단계 데이터 변환 (받는 쪽이 변환 책임)

```
HTTP body
   ↓ ValidationPipe + class-transformer
CreateOrderRequest         ← interfaces 소유
   ↓ request.toCommand()                       ← interfaces 책임
CreateOrderCommand         ← domain 소유
   ↓ orderFacade.createOrder(command)
Order (model)              ← domain 소유
   ↓ OrderInfo.from(model)                     ← application 책임
OrderInfo                  ← application 소유
   ↓ OrderResponse.from(info)                  ← interfaces 책임
OrderResponse              ← interfaces 소유
   ↓ ApiResponse.success(...)
HTTP response (envelope)
```

## Critical Rules — 반드시 지킬 것

| 룰 | 강제 수단 |
|---|---|
| **`!` non-null assertion 금지** | ESLint `no-non-null-assertion: error`. 좁히기는 `expectNotNull(v)` 헬퍼 |
| **`any` / `as any` 금지** | ESLint `no-explicit-any: error`. 도메인 경계는 `toModel` 로 정규화 |
| **`namespace` 금지 — flat export** | ESLint `no-namespace: error`. 한 파일에 여러 클래스 평면 export |
| **파일명 kebab-case, 클래스 PascalCase** | `order-v1.controller.ts` ↔ `OrderV1Controller` |
| **V1 은 HTTP 레이어에만** | `OrderV1Controller`, `order-v1.dto.ts`. 도메인/인프라/응용은 무버전 |
| **클래스명에 도메인 prefix** | `CreateOrderRequest`, `AddCartItemCommand` (모호성 회피) |
| **도메인은 외부 라이브러리 import 금지** | `support/error` 만 OK. Prisma/Nest 데코레이터 X (단 abstract Repository 의 `Prisma.TransactionClient` 타입만 예외) |
| **Repository = 추상 클래스 (DI 토큰)** | TS interface 는 런타임 메타데이터 X. domain 의 `abstract class XxxRepository` ↔ infrastructure 의 `XxxRepositoryImpl extends XxxRepository` |
| **Enum = `as const` + `keyof typeof`** | `enum` 키워드 안 씀. `export type X = (typeof X)[keyof typeof X]` 동반 |
| **트랜잭션 경계 = Facade** | `prisma.$transaction(async (tx) => ...)`. `tx` 를 service → repository 로 명시 전파 |
| **응답 봉투 = `ApiResponse<T>`** | 성공은 `ApiResponse.success(data)`, void 는 `ApiResponse.empty()` |
| **에러 = `CoreException(ErrorType, ErrorCode, detail?)`** | 직접 `throw new Error(...)` X. `support/handling-errors` skill 참조 |

## 검증 명령 (커밋 / PR 전 반드시)

```bash
pnpm tsc --noEmit          # 타입 체크 (0 errors 필수)
pnpm lint                  # ESLint + auto-fix
pnpm test                  # Unit 60+ (<5초)
pnpm test:int              # Integration 15+ (testcontainers, ~25초, Docker 필요)
pnpm test:e2e              # E2E 15+ (~20초, Docker 필요)
pnpm test:ci               # 위 셋을 한 번에
```

## Skill 인덱스 — 작업 종류별 길잡이

| 작업 | 사용 Skill |
|---|---|
| 신규 도메인 기능 (cart/order/product 같은 *개념 자체* 추가) | `creating-feature` |
| 기존 기능에 새 라우트/유스케이스 (POST/GET 추가) | `adding-endpoint` |
| 도메인 모델 변경 (필드 추가/제거, 새 메서드, invariant 강화) | `modifying-domain` |
| 테스트 작성/수정 (Unit / Integration / E2E) | `writing-tests` |
| 새 에러 정의, throw 위치 결정, 에러 응답 shape | `handling-errors` |

각 skill 은 `.claude/skills/<name>/SKILL.md` 에 있다.

## 살아있는 참고 코드 (drift 없으니 *그대로* 따라가도 OK)

| 무엇 | 경로 |
|---|---|
| 도메인 모델 (행위 보유) | `src/domain/product/product.model.ts` |
| 도메인 모델 (aggregate) | `src/domain/order/order.model.ts` (+ `order-item.model.ts`, `order-status.ts`) |
| 추상 Repository | `src/domain/order/order.repository.ts` |
| Repository 구현 (toModel 패턴) | `src/infrastructure/order/order.repository.impl.ts` |
| Facade (트랜잭션 경계 예시) | `src/application/order/order.facade.ts` |
| 도메인 서비스 (cross-domain repository 호출) | `src/domain/order/order.service.ts` |
| 모듈 DI 바인딩 | `src/application/order/order.module.ts` |
| Controller + Swagger | `src/interfaces/api/order/order-v1.controller.ts` |
| DTO (Request → Command, Response.from(info)) | `src/interfaces/api/order/order-v1.dto.ts` |
| 도메인 Unit 테스트 | `src/domain/product/product.model.spec.ts` |
| Repository Integration 테스트 | `test/integration/order.repository.int-spec.ts` |
| E2E 테스트 (HTTP + DB 검증) | `test/e2e/orders.e2e-spec.ts` |
| 빌더 (factory + builder) | `test/support/builders/` |
| 헬퍼 (expectNotNull 등) | `test/support/expect-helpers.ts` |
| testcontainers 환경 | `test/support/prisma-test-env.ts` |
| E2E 앱 부팅 | `test/support/nest-test-app.ts` |

## 의도적 미포함 (Out of Scope)

레퍼런스에는 있지만 본 프로젝트 현재 범위 밖. 다음 작업 시 *추가하지 말 것* — 사용자가 명시적으로 요청해야 도입.

- Auth / Session / JWT
- Idempotency 헤더 처리
- `@nestjs/event-emitter` (도메인 이벤트)
- Outbox / Kafka
- Coupon / Queue / Ranking
- Mutation / Contract / 부하 테스트
- 관찰성 (OpenTelemetry, Prometheus)
- `/health`, graceful shutdown, rate limiting
