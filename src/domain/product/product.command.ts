export class DecreaseProductStockCommand {
  readonly productId: number;
  readonly quantity: number;

  constructor(props: { productId: number; quantity: number }) {
    this.productId = props.productId;
    this.quantity = props.quantity;
  }
}
