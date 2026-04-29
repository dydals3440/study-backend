import { ErrorCode } from '../../src/support/error/error-code';

/**
 * `result!.field` 같은 비-널 단언 없이 nullable 값을 좁히기 위한 assertion 함수.
 * `expect(x).not.toBeNull()` 은 jest matcher 라 TS 타입을 좁혀주지 않으므로
 * 이 헬퍼를 통해 *진짜* 컴파일러 narrowing 을 수행한다.
 */
export function expectNotNull<T>(
  value: T | null | undefined,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`expected non-null/undefined, got: ${String(value)}`);
  }
}

/**
 * Promise 가 CoreException 으로 reject 되며 errorCode 가 일치함을 검증.
 * `await expect(fn()).rejects.toMatchObject({ errorCode })` 의 보일러플레이트 축약.
 */
export async function expectCoreExceptionAsync(
  fn: () => Promise<unknown>,
  expectedErrorCode: ErrorCode,
): Promise<void> {
  await expect(fn()).rejects.toMatchObject({
    errorCode: expectedErrorCode,
  });
}

/**
 * 동기 함수가 CoreException 을 던지며 errorCode 가 일치함을 검증.
 */
export function expectCoreException(
  fn: () => unknown,
  expectedErrorCode: ErrorCode,
): void {
  expect(fn).toThrow(expect.objectContaining({ errorCode: expectedErrorCode }));
}
