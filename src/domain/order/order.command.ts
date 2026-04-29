export class CreateOrderItemCommand {
  readonly productId: number;
  readonly quantity: number;

  constructor(props: { productId: number; quantity: number }) {
    this.productId = props.productId;
    this.quantity = props.quantity;
  }
}

export class CreateOrderCommand {
  readonly customerId: number;
  readonly items: readonly CreateOrderItemCommand[];

  constructor(props: {
    customerId: number;
    items: readonly CreateOrderItemCommand[];
  }) {
    this.customerId = props.customerId;
    this.items = props.items;
  }
}
