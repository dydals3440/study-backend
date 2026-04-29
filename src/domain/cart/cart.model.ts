import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { CartErrorCode } from './cart-error-code';

export class Cart {
  readonly id: number;
  readonly customerId: number;
  readonly productId: number;
  readonly unitPrice: number;
  readonly quantity: number;

  private constructor(props: {
    id: number;
    customerId: number;
    productId: number;
    unitPrice: number;
    quantity: number;
  }) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.productId = props.productId;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
  }

  static create(props: {
    customerId: number;
    productId: number;
    unitPrice: number;
    quantity: number;
  }): Cart {
    if (props.quantity < 1) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        CartErrorCode.QUANTITY_NOT_POSITIVE,
        { quantity: props.quantity },
      );
    }
    if (props.unitPrice < 0) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        CartErrorCode.PRICE_NEGATIVE,
        { unitPrice: props.unitPrice },
      );
    }
    return new Cart({ id: 0, ...props });
  }

  static restore(props: {
    id: number;
    customerId: number;
    productId: number;
    unitPrice: number;
    quantity: number;
  }): Cart {
    return new Cart(props);
  }
}
