import { ErrorCode } from '../../support/error/error-code';

export const OrderErrorCode = {
  NOT_FOUND: {
    code: 'order.not-found',
    message: '주문을 찾을 수 없습니다.',
  },
  ITEMS_EMPTY: {
    code: 'order.items.empty',
    message: '주문 항목은 비어있을 수 없습니다.',
  },
  QUANTITY_NOT_POSITIVE: {
    code: 'order.quantity.not-positive',
    message: '수량은 1 이상이어야 합니다.',
  },
  PRICE_NEGATIVE: {
    code: 'order.price.negative',
    message: '가격은 0 이상이어야 합니다.',
  },
  CORRUPTED_ROW: {
    code: 'order.corrupted-row',
    message: '주문 데이터가 손상되었습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
export type OrderErrorCode =
  (typeof OrderErrorCode)[keyof typeof OrderErrorCode];
