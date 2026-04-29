import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';
import {
  OrderInfo,
  OrderItemInfo,
} from '../../../application/order/order.info';
import {
  CreateOrderCommand,
  CreateOrderItemCommand,
} from '../../../domain/order/order.command';
import { OrderStatus } from '../../../domain/order/order-status';

export class OrderItemRequest {
  @IsInt()
  @ApiProperty({ description: '상품 ID', example: 100 })
  productId: number;

  @IsInt()
  @ApiProperty({ description: '주문 수량', example: 2 })
  quantity: number;
}

export class CreateOrderRequest {
  @IsInt()
  @ApiProperty({ description: '회원 ID', example: 1 })
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  @ApiProperty({
    description: '주문 항목 목록',
    type: () => OrderItemRequest,
    isArray: true,
  })
  items: OrderItemRequest[];

  toCommand(): CreateOrderCommand {
    return new CreateOrderCommand({
      customerId: this.customerId,
      items: this.items.map(
        (it) =>
          new CreateOrderItemCommand({
            productId: it.productId,
            quantity: it.quantity,
          }),
      ),
    });
  }
}

export class OrderItemResponse {
  @ApiProperty()
  readonly id: number;
  @ApiProperty()
  readonly productId: number;
  @ApiProperty()
  readonly productName: string;
  @ApiProperty()
  readonly quantity: number;
  @ApiProperty()
  readonly price: number;

  constructor(props: {
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

  static from(info: OrderItemInfo): OrderItemResponse {
    return new OrderItemResponse({
      id: info.id,
      productId: info.productId,
      productName: info.productName,
      quantity: info.quantity,
      price: info.price,
    });
  }
}

export class OrderResponse {
  @ApiProperty()
  readonly id: number;
  @ApiProperty()
  readonly orderNo: string;
  @ApiProperty()
  readonly customerId: number;
  @ApiProperty({ enum: Object.values(OrderStatus) })
  readonly status: OrderStatus;
  @ApiProperty()
  readonly totalPrice: number;
  @ApiProperty()
  readonly originalPrice: number;
  @ApiProperty()
  readonly discountAmount: number;
  @ApiProperty({ nullable: true, type: Number })
  readonly couponId: number | null;
  @ApiProperty({ type: () => OrderItemResponse, isArray: true })
  readonly orderItems: readonly OrderItemResponse[];

  constructor(props: {
    id: number;
    orderNo: string;
    customerId: number;
    status: OrderStatus;
    totalPrice: number;
    originalPrice: number;
    discountAmount: number;
    couponId: number | null;
    orderItems: readonly OrderItemResponse[];
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

  static from(info: OrderInfo): OrderResponse {
    return new OrderResponse({
      id: info.id,
      orderNo: info.orderNo,
      customerId: info.customerId,
      status: info.status,
      totalPrice: info.totalPrice,
      originalPrice: info.originalPrice,
      discountAmount: info.discountAmount,
      couponId: info.couponId,
      orderItems: info.orderItems.map((item) => OrderItemResponse.from(item)),
    });
  }
}
