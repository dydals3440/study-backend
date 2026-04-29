import { Injectable } from '@nestjs/common';
import { CartRepository } from 'src/cart/infra/cart.repository';
import { CreateCartDto } from '../dto/create-cart.dto';
import { cart } from 'src/generated/prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  async createCart(createCartDto: CreateCartDto): Promise<cart> {
    return await this.cartRepository.createCart(createCartDto);
  }
}
