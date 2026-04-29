import { ApiProperty } from '@nestjs/swagger';
import { ProductInfo } from '../../../application/product/product.info';

export class ProductResponse {
  @ApiProperty()
  readonly id: number;
  @ApiProperty()
  readonly name: string;
  @ApiProperty()
  readonly price: number;
  @ApiProperty()
  readonly stock: number;

  constructor(props: {
    id: number;
    name: string;
    price: number;
    stock: number;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.price = props.price;
    this.stock = props.stock;
  }

  static from(info: ProductInfo): ProductResponse {
    return new ProductResponse({
      id: info.id,
      name: info.name,
      price: info.price,
      stock: info.stock,
    });
  }
}
