import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { OrderErrorCode } from './order-error-code';

export class OrderItem {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly price: number;

  private constructor(props: {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }) {
    this.id = props.id;
    this.productId = props.productId;
    this.productName = props.productName;
    this.quantity = props.quantity;
    this.price = props.price;
  }

  static create(props: {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }): OrderItem {
    if (props.quantity < 1) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        OrderErrorCode.QUANTITY_NOT_POSITIVE,
        { quantity: props.quantity },
      );
    }
    if (props.price < 0) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        OrderErrorCode.PRICE_NEGATIVE,
        { price: props.price },
      );
    }
    return new OrderItem({ id: 0, ...props });
  }

  static restore(props: {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }): OrderItem {
    return new OrderItem(props);
  }

  totalPrice(): number {
    return this.price * this.quantity;
  }
}
