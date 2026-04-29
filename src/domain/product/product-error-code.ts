import { ErrorCode } from '../../support/error/error-code';

export const ProductErrorCode = {
  NOT_FOUND: {
    code: 'product.not-found',
    message: '상품을 찾을 수 없습니다.',
  },
  NOT_ENOUGH_STOCK: {
    code: 'product.not-enough-stock',
    message: '재고가 부족합니다.',
  },
  QUANTITY_NOT_POSITIVE: {
    code: 'product.quantity.not-positive',
    message: '수량은 1 이상이어야 합니다.',
  },
  CORRUPTED_ROW: {
    code: 'product.corrupted-row',
    message: '상품 데이터가 손상되었습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
export type ProductErrorCode =
  (typeof ProductErrorCode)[keyof typeof ProductErrorCode];
