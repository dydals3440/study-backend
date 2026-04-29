import { Injectable } from '@nestjs/common';

@Injectable()
export class CartService {
  findAll() {
    return `This action returns all cart`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cart`;
  }
}
