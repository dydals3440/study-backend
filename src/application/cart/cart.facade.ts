import { Injectable } from '@nestjs/common';
import { AddCartItemCommand } from '../../domain/cart/cart.command';
import { CartService } from '../../domain/cart/cart.service';
import { CartInfo } from './cart.info';

@Injectable()
export class CartFacade {
  constructor(private readonly cartService: CartService) {}

  async addItem(command: AddCartItemCommand): Promise<CartInfo> {
    const cart = await this.cartService.addItem(command);
    return CartInfo.from(cart);
  }

  async getCart(customerId: number): Promise<CartInfo[]> {
    const carts = await this.cartService.findByCustomerId(customerId);
    return carts.map((cart) => CartInfo.from(cart));
  }

  async clear(customerId: number): Promise<void> {
    await this.cartService.deleteByCustomerId(customerId);
  }
}
