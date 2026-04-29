import { OrderItem } from '../../domain/order/order-item.model';
import { Order } from '../../domain/order/order.model';
import { OrderStatus } from '../../domain/order/order-status';

export class OrderItemInfo {
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

  static from(model: OrderItem): OrderItemInfo {
    return new OrderItemInfo({
      id: model.id,
      productId: model.productId,
      productName: model.productName,
      quantity: model.quantity,
      price: model.price,
    });
  }
}

export class OrderInfo {
  readonly id: number;
  readonly orderNo: string;
  readonly customerId: number;
  readonly status: OrderStatus;
  readonly totalPrice: number;
  readonly originalPrice: number;
  readonly discountAmount: number;
  readonly couponId: number | null;
  readonly orderItems: readonly OrderItemInfo[];

  private constructor(props: {
    id: number;
    orderNo: string;
    customerId: number;
    status: OrderStatus;
    totalPrice: number;
    originalPrice: number;
    discountAmount: number;
    couponId: number | null;
    orderItems: readonly OrderItemInfo[];
  }) {
    this.id = props.id;
    this.orderNo = props.orderNo;
    this.customerId = props.customerId;
    this.status = props.status;
    this.totalPrice = props.totalPrice;
    this.originalPrice = props.originalPrice;
    this.discountAmount = props.discountAmount;
    this.couponId = props.couponId;
    this.orderItems = props.orderItems;
  }

  static from(model: Order): OrderInfo {
    return new OrderInfo({
      id: model.id,
      orderNo: model.orderNo,
      customerId: model.customerId,
      status: model.status,
      totalPrice: model.totalPrice,
      originalPrice: model.originalPrice,
      discountAmount: model.discountAmount,
      couponId: model.couponId,
      orderItems: model.orderItems.map((item) => OrderItemInfo.from(item)),
    });
  }
}
