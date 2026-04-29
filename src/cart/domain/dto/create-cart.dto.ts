import { cart } from '../../../generated/prisma/client';

export class CreateCartDto {
  customerId: number;
  productId: number;
  unitPrice: number;
  qty: number;
  createdAt: Date;
  updatedAt: Date;

  // createCartDto를 cart 타입으로 변환
  static to(dto: CreateCartDto): Omit<cart, 'id'> {
    return {
      customer_id: dto.customerId,
      product_id: dto.productId,
      unit_price: dto.unitPrice,
      qty: dto.qty,
      created_at: new Date(dto.createdAt),
      updated_at: new Date(dto.updatedAt),
    };
  }
}
