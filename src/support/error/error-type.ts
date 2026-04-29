import { HttpStatus } from '@nestjs/common';

export const ErrorType = {
  BAD_REQUEST: {
    httpStatus: HttpStatus.BAD_REQUEST,
    code: 'error.bad-request',
    message: '잘못된 요청입니다.',
  },
  NOT_FOUND: {
    httpStatus: HttpStatus.NOT_FOUND,
    code: 'error.not-found',
    message: '리소스를 찾을 수 없습니다.',
  },
  CONFLICT: {
    httpStatus: HttpStatus.CONFLICT,
    code: 'error.conflict',
    message: '요청이 충돌합니다.',
  },
  FORBIDDEN: {
    httpStatus: HttpStatus.FORBIDDEN,
    code: 'error.forbidden',
    message: '권한이 없습니다.',
  },
  INTERNAL: {
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'error.internal',
    message: '내부 오류가 발생했습니다.',
  },
} as const satisfies Record<
  string,
  { httpStatus: HttpStatus; code: string; message: string }
>;
export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];
