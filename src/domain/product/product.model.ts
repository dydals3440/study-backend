import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { ProductErrorCode } from './product-error-code';

export class Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  #stock: number;

  private constructor(props: {
    id: number;
    name: string;
    price: number;
    stock: number;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.price = props.price;
    this.#stock = props.stock;
  }

  get stock(): number {
    return this.#stock;
  }

  static restore(props: {
    id: number;
    name: string;
    price: number;
    stock: number;
  }): Product {
    return new Product(props);
  }

  decreaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        ProductErrorCode.QUANTITY_NOT_POSITIVE,
        { quantity },
      );
    }
    if (this.#stock < quantity) {
      throw new CoreException(
        ErrorType.CONFLICT,
        ProductErrorCode.NOT_ENOUGH_STOCK,
        {
          productId: this.id,
          requested: quantity,
          available: this.#stock,
        },
      );
    }
    this.#stock -= quantity;
  }
}
