import { Injectable, NotFoundException } from '@nestjs/common';
import type { cart, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/db/prisma.service';
import { CreateCartDto } from '../domain/dto/create-cart.dto';

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCartById(id: number): Promise<cart> {
    const cartInfo = await this.prisma.cart.findUnique({ where: { id } });

    if (!cartInfo) {
      throw new NotFoundException('Cart not found');
    }

    return cartInfo;
  }

  async createCart(createCartDto: CreateCartDto): Promise<cart> {
    // DTO를 가지고, 그대로 DB에 넣을 것 인가.
    // Repository, Domain 단의 DTO를 같이 활용해도됨. 이를 분리시키는게 좀 더 좋을지도.
    // 이를 분리시킴으로서 도메인에대한 수정사항이 발생했을떄 Repository의 영향과, Repository에서 수정할때의 영향을 최소화.

    // Repository: DB에 대한 CRUD 작업을 수행
    // Service: 비즈니스 로직을 수행
    // Domain: 받아오는 데이터와, Entity가 다르기 때문에 변화하는 컨버팅이 필요함.
    const cartData = CreateCartDto.to(createCartDto);

    const cartInfo = await this.prisma.cart.create({
      data: cartData,
    });

    return cartInfo;
  }

  async deleteCart(
    customerId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    await tx.cart.deleteMany({
      where: {
        customer_id: customerId,
      },
    });

    return true;
  }
}
