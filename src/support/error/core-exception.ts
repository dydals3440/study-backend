import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-code';
import { ErrorType } from './error-type';

export class CoreException extends HttpException {
  readonly errorType: ErrorType;
  readonly errorCode: ErrorCode;
  readonly detail?: unknown;

  constructor(errorType: ErrorType, errorCode: ErrorCode, detail?: unknown) {
    super(
      {
        type: errorType.code,
        code: errorCode.code,
        message: errorCode.message,
        detail,
      },
      errorType.httpStatus,
    );
    this.errorType = errorType;
    this.errorCode = errorCode;
    this.detail = detail;
  }
}
