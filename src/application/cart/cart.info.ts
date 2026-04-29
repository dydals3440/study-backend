import { Cart } from '../../domain/cart/cart.model';

export class CartInfo {
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

  static from(model: Cart): CartInfo {
    return new CartInfo({
      id: model.id,
      customerId: model.customerId,
      productId: model.productId,
      unitPrice: model.unitPrice,
      quantity: model.quantity,
    });
  }
}
