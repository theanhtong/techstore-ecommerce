import { NotificationType, OrderStatus } from '../../generated/prisma/enums.js';

export const ORDER_NOTIFICATION_MAP: Partial<
  Record<OrderStatus, { type: NotificationType; title: string }>
> = {
  PENDING: { type: 'ORDER_PLACED', title: 'Order placed successfully' },
  CONFIRMED: { type: 'ORDER_CONFIRMED', title: 'Order confirmed' },
  SHIPPED: { type: 'ORDER_SHIPPED', title: 'Order is being shipped' },
  DELIVERED: { type: 'ORDER_DELIVERED', title: 'Order delivered successfully' },
  CANCELLED: { type: 'ORDER_CANCELLED', title: 'Order cancelled' },
};
