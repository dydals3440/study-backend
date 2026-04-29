import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { CartInfo } from '../../../application/cart/cart.info';
import { AddCartItemCommand } from '../../../domain/cart/cart.command';

export class AddCartItemRequest {
  @IsInt()
  @ApiProperty({ description: '회원 ID', example: 1 })
  customerId: number;

  @IsInt()
  @ApiProperty({ description: '상품 ID', example: 100 })
  productId: number;

  @IsInt()
  @ApiProperty({ description: '단가 (원)', example: 10000 })
  unitPrice: number;

  @IsInt()
  @ApiProperty({ description: '수량', example: 2 })
  quantity: number;

  toCommand(): AddCartItemCommand {
    return new AddCartItemCommand({
      customerId: this.customerId,
      productId: this.productId,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
    });
  }
}

export class CartItemResponse {
  @ApiProperty()
  readonly id: number;
  @ApiProperty()
  readonly customerId: number;
  @ApiProperty()
  readonly productId: number;
  @ApiProperty()
  readonly unitPrice: number;
  @ApiProperty()
  readonly quantity: number;

  constructor(props: {
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

  static from(info: CartInfo): CartItemResponse {
    return new CartItemResponse({
      id: info.id,
      customerId: info.customerId,
      productId: info.productId,
      unitPrice: info.unitPrice,
      quantity: info.quantity,
    });
  }
}
