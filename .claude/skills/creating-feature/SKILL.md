---
name: creating-feature
description: Use when adding a new domain feature (a commerce concept like cart, order, product). Scaffolds all required files across interfaces / application / domain / infrastructure layers with the correct naming, conversions, DI bindings, and tests.
---

# Creating a New Feature

새 도메인 *개념* 을 추가할 때 (예: `coupon`, `member`, `category`). 4-Layer 헥사고날의 모든 layer에 파일이 필요하다. 이 가이드는 *전부 빠짐없이 만들고* 잊기 쉬운 wiring을 챙긴다.

## When to Use

- 새 commerce 개념을 도입한다 (`cart`, `order`, `product` 처럼 *aggregate root* 가 새로 생김)
- *기존* 도메인의 자식 엔티티는 NOT (예: `OrderItem` 추가는 modifying-domain)
- *기존* 도메인의 새 라우트는 NOT (adding-endpoint)

## 작성 순서 (안쪽 → 바깥쪽)

```
1. Prisma schema 추가         (DB 표현 정의)
2. domain/                    (model, repository, service, command, error-code)
3. infrastructure/            (repository.impl — toModel 매퍼)
4. application/               (info, facade, module — DI binding)
5. interfaces/api/            (api-spec, controller, dto)
6. test/support/builders/     (테스트 빌더)
7. spec 파일들                 (각 layer 의 테스트)
8. app.module.ts 등록
```

## 파일 체크리스트 (`<feature>` = `coupon` 같은 kebab-case)

### Step 1. Prisma schema

```prisma
// prisma/schema.prisma
model <feature> {
  id Int @id @default(autoincrement())
  // 비즈니스 컬럼 (가능하면 NOT NULL — 도메인 기본 가정)
}
```

`pnpm prisma:migrate` 로 마이그레이션 적용. 클라이언트 자동 재생성.

### Step 2. Domain layer (5 파일)

> 참고 코드: `src/domain/product/`

**`src/domain/<feature>/<feature>-error-code.ts`** — 도메인 에러 맵
```ts
import { ErrorCode } from '../../support/error/error-code';

export const <Feature>ErrorCode = {
  NOT_FOUND: { code: '<feature>.not-found', message: '...' },
  CORRUPTED_ROW: { code: '<feature>.corrupted-row', message: '...' },
  // 비즈니스 룰별 항목 추가
} as const satisfies Record<string, ErrorCode>;
export type <Feature>ErrorCode = (typeof <Feature>ErrorCode)[keyof typeof <Feature>ErrorCode];
```

**`src/domain/<feature>/<feature>.model.ts`** — 엔티티 + 행위
```ts
export class <Feature> {
  readonly id: number;
  readonly name: string;
  // ... 다른 readonly 필드
  // 변경 가능한 상태는 #private + getter

  private constructor(props: { id: number; name: string; /* ... */ }) {
    this.id = props.id;
    this.name = props.name;
  }

  static restore(props: { id: number; name: string; /* ... */ }): <Feature> {
    return new <Feature>(props);
  }

  // 비즈니스 행위 (있다면)
  someBehavior(): void { /* invariant 검증 + 상태 변경 */ }
}
```

**`src/domain/<feature>/<feature>.command.ts`** — 도메인 명령 객체
```ts
export class Create<Feature>Command {
  readonly name: string;
  constructor(props: { name: string }) {
    this.name = props.name;
  }
}
```

**`src/domain/<feature>/<feature>.repository.ts`** — 추상 클래스 (DI 토큰)
```ts
import type { Prisma } from '../../generated/prisma/client';
import { <Feature> } from './<feature>.model';

export abstract class <Feature>Repository {
  abstract findById(id: number, tx?: Prisma.TransactionClient): Promise<<Feature> | null>;
  abstract save(<feature>: <Feature>, tx?: Prisma.TransactionClient): Promise<<Feature>>;
  // 다른 query 메서드 — 도메인 use case가 필요로 하는 것만
}
```

**`src/domain/<feature>/<feature>.service.ts`** — 도메인 서비스
```ts
import { Injectable } from '@nestjs/common';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { <Feature>ErrorCode } from './<feature>-error-code';
import { <Feature>Repository } from './<feature>.repository';
// import type { Prisma } from '../../generated/prisma/client'; // tx 필요 시

@Injectable()
export class <Feature>Service {
  constructor(private readonly <feature>Repository: <Feature>Repository) {}

  async findById(id: number): Promise<<Feature>> {
    const <feature> = await this.<feature>Repository.findById(id);
    if (!<feature>) {
      throw new CoreException(ErrorType.NOT_FOUND, <Feature>ErrorCode.NOT_FOUND, { id });
    }
    return <feature>;
  }
}
```

### Step 3. Infrastructure layer (1 파일)

> 참고 코드: `src/infrastructure/product/product.repository.impl.ts`

**`src/infrastructure/<feature>/<feature>.repository.impl.ts`**
```ts
import { Injectable } from '@nestjs/common';
import type { Prisma, <feature> as <Feature>Row } from '../../generated/prisma/client';
import { <Feature>ErrorCode } from '../../domain/<feature>/<feature>-error-code';
import { <Feature> } from '../../domain/<feature>/<feature>.model';
import { <Feature>Repository } from '../../domain/<feature>/<feature>.repository';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';

@Injectable()
export class <Feature>RepositoryImpl extends <Feature>Repository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number, tx: Prisma.TransactionClient = this.prisma): Promise<<Feature> | null> {
    const row = await tx.<feature>.findUnique({ where: { id } });
    return row ? <Feature>RepositoryImpl.toModel(row) : null;
  }

  async save(model: <Feature>, tx: Prisma.TransactionClient = this.prisma): Promise<<Feature>> {
    if (model.id === 0) {
      const created = await tx.<feature>.create({ data: { name: model.name /* ... */ } });
      return <Feature>RepositoryImpl.toModel(created);
    }
    const updated = await tx.<feature>.update({
      where: { id: model.id },
      data: { name: model.name /* ... */ },
    });
    return <Feature>RepositoryImpl.toModel(updated);
  }

  // 도메인 nullable 차단 — 필수 필드가 null 이면 CORRUPTED_ROW
  private static toModel(row: <Feature>Row): <Feature> {
    if (row.name === null /* || 다른 필수 컬럼 === null */) {
      throw new CoreException(ErrorType.INTERNAL, <Feature>ErrorCode.CORRUPTED_ROW, { id: row.id });
    }
    return <Feature>.restore({ id: row.id, name: row.name /* ... */ });
  }
}
```

`save` 의 `id === 0` 분기는 우리 컨벤션 — 도메인 모델에서 새 객체는 id=0 sentinel.

### Step 4. Application layer (3 파일)

> 참고 코드: `src/application/product/`

**`src/application/<feature>/<feature>.info.ts`** — 응용 결과 객체
```ts
import { <Feature> } from '../../domain/<feature>/<feature>.model';

export class <Feature>Info {
  readonly id: number;
  readonly name: string;

  private constructor(props: { id: number; name: string }) {
    this.id = props.id;
    this.name = props.name;
  }

  static from(model: <Feature>): <Feature>Info {
    return new <Feature>Info({ id: model.id, name: model.name });
  }
}
```

**`src/application/<feature>/<feature>.facade.ts`** — 트랜잭션 경계 + 오케스트레이션
```ts
import { Injectable } from '@nestjs/common';
import { <Feature>Service } from '../../domain/<feature>/<feature>.service';
// import { PrismaService } from '../../modules/prisma/prisma.service'; // 트랜잭션 필요 시
import { <Feature>Info } from './<feature>.info';

@Injectable()
export class <Feature>Facade {
  constructor(private readonly <feature>Service: <Feature>Service) {}

  async getById(id: number): Promise<<Feature>Info> {
    const model = await this.<feature>Service.findById(id);
    return <Feature>Info.from(model);
  }
}
```

쓰기 (트랜잭션 필요) 시:
```ts
async create(command: Create<Feature>Command): Promise<<Feature>Info> {
  const model = await this.prisma.$transaction(async (tx) => {
    return this.<feature>Service.create(command, tx);
  });
  return <Feature>Info.from(model);
}
```

**`src/application/<feature>/<feature>.module.ts`** — Nest 모듈 (DI 바인딩)
```ts
import { Module } from '@nestjs/common';
import { <Feature>Repository } from '../../domain/<feature>/<feature>.repository';
import { <Feature>Service } from '../../domain/<feature>/<feature>.service';
import { <Feature>RepositoryImpl } from '../../infrastructure/<feature>/<feature>.repository.impl';
import { <Feature>V1Controller } from '../../interfaces/api/<feature>/<feature>-v1.controller';
import { <Feature>Facade } from './<feature>.facade';

@Module({
  controllers: [<Feature>V1Controller],
  providers: [
    <Feature>Facade,
    <Feature>Service,
    { provide: <Feature>Repository, useClass: <Feature>RepositoryImpl }, // ← 핵심: 추상 → 구현 바인딩
  ],
  exports: [<Feature>Repository], // 다른 도메인이 cross-context 로 쓰면 export
})
export class <Feature>Module {}
```

### Step 5. Interfaces layer (3 파일)

> 참고 코드: `src/interfaces/api/order/`

**`src/interfaces/api/<feature>/<feature>-v1.dto.ts`** — Request / Response (flat export)
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { <Feature>Info } from '../../../application/<feature>/<feature>.info';
import { Create<Feature>Command } from '../../../domain/<feature>/<feature>.command';

export class Create<Feature>Request {
  @IsString() @ApiProperty({ description: '...', example: 'X' })
  name: string;

  toCommand(): Create<Feature>Command {
    return new Create<Feature>Command({ name: this.name });
  }
}

export class <Feature>Response {
  @ApiProperty() readonly id: number;
  @ApiProperty() readonly name: string;

  constructor(props: { id: number; name: string }) {
    this.id = props.id;
    this.name = props.name;
  }

  static from(info: <Feature>Info): <Feature>Response {
    return new <Feature>Response({ id: info.id, name: info.name });
  }
}
```

**`src/interfaces/api/<feature>/<feature>-v1.api-spec.ts`** — TS 인터페이스 (타입 컨트랙트)
```ts
import { ApiResponse } from '../api-response';
import { Create<Feature>Request, <Feature>Response } from './<feature>-v1.dto';

export interface <Feature>V1ApiSpec {
  create(request: Create<Feature>Request): Promise<ApiResponse<<Feature>Response>>;
  getById(id: number): Promise<ApiResponse<<Feature>Response>>;
}
```

**`src/interfaces/api/<feature>/<feature>-v1.controller.ts`** — REST controller
```ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { <Feature>Facade } from '../../../application/<feature>/<feature>.facade';
import { ApiResponse } from '../api-response';
import { ApiSuccessResponse } from '../api-success-response.decorator';
import { <Feature>V1ApiSpec } from './<feature>-v1.api-spec';
import { Create<Feature>Request, <Feature>Response } from './<feature>-v1.dto';

@ApiTags('<Feature> V1 API')
@Controller({ path: '<feature>s', version: '1' }) // path 는 복수형
export class <Feature>V1Controller implements <Feature>V1ApiSpec {
  constructor(private readonly <feature>Facade: <Feature>Facade) {}

  @Post()
  @ApiOperation({ summary: '<feature> 생성' })
  @ApiSuccessResponse(<Feature>Response)
  async create(@Body() request: Create<Feature>Request): Promise<ApiResponse<<Feature>Response>> {
    const info = await this.<feature>Facade.create(request.toCommand());
    return ApiResponse.success(<Feature>Response.from(info));
  }

  @Get(':id')
  @ApiOperation({ summary: '<feature> 단건 조회' })
  @ApiParam({ name: 'id', type: 'integer' })
  @ApiSuccessResponse(<Feature>Response)
  async getById(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<<Feature>Response>> {
    const info = await this.<feature>Facade.getById(id);
    return ApiResponse.success(<Feature>Response.from(info));
  }
}
```

### Step 6. Test builder

> 참고 코드: `test/support/builders/product.builder.ts`

**`test/support/builders/<feature>.builder.ts`**
```ts
import { faker } from '@faker-js/faker';
import type { Prisma } from '../../../src/generated/prisma/client';
import { <Feature> } from '../../../src/domain/<feature>/<feature>.model';

type <Feature>Props = Parameters<typeof <Feature>.restore>[0];
type <Feature>CreateInput = Prisma.<feature>UncheckedCreateInput;

export const a<Feature> = (overrides: Partial<<Feature>Props> = {}): <Feature> =>
  <Feature>.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    name: faker.commerce.productName(),
    ...overrides,
  });

export const a<Feature>Row = (overrides: Partial<<Feature>CreateInput> = {}): <Feature>CreateInput => ({
  name: faker.commerce.productName(),
  ...overrides,
});
```

### Step 7. 테스트 작성

`writing-tests` skill 참조. 최소:

- `src/domain/<feature>/<feature>.model.spec.ts` — Unit (성공·경계·실패·불변성)
- `src/domain/<feature>/<feature>.service.spec.ts` — Unit (mocked Repository)
- `src/application/<feature>/<feature>.facade.spec.ts` — Unit (mocked Service)
- `test/integration/<feature>.repository.int-spec.ts` — Integration (testcontainers)
- `test/e2e/<feature>s.e2e-spec.ts` — E2E (HTTP + DB side effect)

### Step 8. App module 에 등록 (잊기 쉬움!)

```ts
// src/app.module.ts
import { <Feature>Module } from './application/<feature>/<feature>.module';

@Module({
  imports: [
    /* 기존 모듈들 */,
    <Feature>Module, // ← 추가
  ],
})
export class AppModule {}
```

## 검증

```bash
pnpm tsc --noEmit          # 타입 0 errors
pnpm test                  # 새 unit 테스트 통과
pnpm test:int              # 새 repository integration 통과
pnpm test:e2e              # 새 endpoint E2E 통과
pnpm lint                  # ESLint 통과
```

Swagger UI (`/docs`) 에서 새 엔드포인트가 노출되는지 확인.

## 흔한 실수

1. **`app.module.ts` 등록 누락** — `<Feature>Module` import 안 함 → 라우트 404
2. **DI 바인딩 누락** — `{ provide: XxxRepository, useClass: XxxRepositoryImpl }` 빠뜨림 → `Cannot resolve dependency` 에러
3. **`@Global()` 안 붙은 모듈을 다른 도메인에서 쓰려 함** — 그 모듈을 import 하거나 `exports` 추가
4. **path 복수형 안 씀** — `@Controller({ path: '<feature>s' })` (`carts`, `orders`, `products`)
5. **Request DTO에 validation decorator 누락** — `@IsInt()` 등 없으면 ValidationPipe 가 검증 못 함 → `customerId: undefined` 같은 게 통과
6. **`toCommand()` 인스턴스 메서드 잊음** — controller에서 `request.toCommand()` 못 함 → 정적 함수로 우회 X (인스턴스 메서드가 표준)
7. **`toModel` 의 nullable 검증 누락** — DB 손상 row 가 도메인까지 흘러가 `!` 또는 런타임 에러 발생
