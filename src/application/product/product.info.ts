import { Product } from '../../domain/product/product.model';

export class ProductInfo {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly stock: number;

  private constructor(props: {
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

  static from(model: Product): ProductInfo {
    return new ProductInfo({
      id: model.id,
      name: model.name,
      price: model.price,
      stock: model.stock,
    });
  }
}
