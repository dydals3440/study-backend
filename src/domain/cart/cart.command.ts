export class AddCartItemCommand {
  readonly customerId: number;
  readonly productId: number;
  readonly unitPrice: number;
  readonly quantity: number;

  constructor(props: {
    customerId: number;
    productId: number;
    unitPrice: number;
    quantity: number;
  }) {
    this.customerId = props.customerId;
    this.productId = props.productId;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
  }
}
