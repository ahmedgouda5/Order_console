export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SORT_FIELDS = ["createdAt", "amount"] as const;

export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export type OrderSortDirection = "asc" | "desc";

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  amount: string;
  currency: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

export type OrdersPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type OrdersPage = {
  message: string;
  pagination: OrdersPagination;
  orders: Order[];
};

export type CreatedOrderResponse = {
  message: string;
  order: Order;
};

export type OrdersQueryParams = {
  page: number;
  search: string;
  status: OrderStatus | null;
  sortBy: OrderSortField;
  sortOrder: OrderSortDirection;
};

export type OrderSearchResult = {
  message: string;
  count: number;
};
