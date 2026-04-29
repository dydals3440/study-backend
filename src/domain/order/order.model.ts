import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { OrderErrorCode } from './order-error-code';
import { OrderItem } from './order-item.model';
import { OrderStatus } from './order-status';

export class Order {
  readonly id: number;
  readonly orderNo: string;
  readonly customerId: number;
  readonly #orderItems: OrderItem[];
  #status: OrderStatus;
  #totalPrice: number;
  #originalPrice: number;
  #discountAmount: number;
  #couponId: number | null;

  private constructor(props: {
    id: number;
    orderNo: string;
    customerId: number;
    status: OrderStatus;
    totalPrice: number;
    originalPrice: number;
    discountAmount: number;
    couponId: number | null;
    orderItems: OrderItem[];
  }) {
    this.id = props.id;
    this.orderNo = props.orderNo;
    this.customerId = props.customerId;
    this.#status = props.status;
    this.#totalPrice = props.totalPrice;
    this.#originalPrice = props.originalPrice;
    this.#discountAmount = props.discountAmount;
    this.#couponId = props.couponId;
    this.#orderItems = [...props.orderItems];
  }

  get status(): OrderStatus {
    return this.#status;
  }
  get totalPrice(): number {
    return this.#totalPrice;
  }
  get originalPrice(): number {
    return this.#originalPrice;
  }
  get discountAmount(): number {
    return this.#discountAmount;
  }
  get couponId(): number | null {
    return this.#couponId;
  }
  get orderItems(): readonly OrderItem[] {
    return this.#orderItems;
  }

  static create(props: {
    customerId: number;
    orderNo: string;
    items: OrderItem[];
  }): Order {
    if (props.items.length === 0) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        OrderErrorCode.ITEMS_EMPTY,
      );
    }
    const order = new Order({
      id: 0,
      orderNo: props.orderNo,
      customerId: props.customerId,
      status: OrderStatus.CREATED,
      totalPrice: 0,
      originalPrice: 0,
      discountAmount: 0,
      couponId: null,
      orderItems: [],
    });
    for (const item of props.items) {
      order.addItem(item);
    }
    return order;
  }

  static restore(props: {
    id: number;
    orderNo: string;
    customerId: number;
    status: OrderStatus;
    totalPrice: number;
    originalPrice: number;
    discountAmount: number;
    couponId: number | null;
    orderItems: OrderItem[];
  }): Order {
    return new Order(props);
  }

  addItem(item: OrderItem): void {
    this.#orderItems.push(item);
    const itemTotal = item.totalPrice();
    this.#originalPrice += itemTotal;
    this.#totalPrice += itemTotal;
  }

  applyDiscount(discountAmount: number, couponId: number): void {
    this.#discountAmount = discountAmount;
    this.#couponId = couponId;
    this.#totalPrice = this.#originalPrice - discountAmount;
  }

  cancel(): void {
    this.#status = OrderStatus.CANCELLED;
  }
}
