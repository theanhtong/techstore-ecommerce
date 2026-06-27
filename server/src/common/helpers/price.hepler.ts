import { Prisma } from '../../generated/prisma/client.js';

export const toNumber = (value: Prisma.Decimal | string | number): number =>
  typeof value === 'number' ? value : Number(value);

export const calcSubtotal = (
  items: { price: Prisma.Decimal | string; quantity: number }[],
): number =>
  items.reduce((sum, item) => sum + toNumber(item.price) * item.quantity, 0);
