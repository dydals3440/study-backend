import { ErrorCode } from '../../support/error/error-code';

export const CartErrorCode = {
  NOT_FOUND: {
    code: 'cart.not-found',
    message: '장바구니를 찾을 수 없습니다.',
  },
  EMPTY: {
    code: 'cart.empty',
    message: '장바구니가 비어있습니다.',
  },
  QUANTITY_NOT_POSITIVE: {
    code: 'cart.quantity.not-positive',
    message: '수량은 1 이상이어야 합니다.',
  },
  PRICE_NEGATIVE: {
    code: 'cart.price.negative',
    message: '가격은 0 이상이어야 합니다.',
  },
  CORRUPTED_ROW: {
    code: 'cart.corrupted-row',
    message: '장바구니 데이터가 손상되었습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
export type CartErrorCode = (typeof CartErrorCode)[keyof typeof CartErrorCode];
