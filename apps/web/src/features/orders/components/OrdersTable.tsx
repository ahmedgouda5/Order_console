import type { Order } from "../types/orders.types";
import { OrderStatusBadge } from "./OrderStatusBadge";

function formatAmount(order: Order): string {
  const amount = Number(order.amount);

  if (Number.isNaN(amount)) {
    return `${order.amount} ${order.currency}`;
  }

  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${order.currency}`;
}

function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type OrdersTableProps = {
  orders: Order[];
  isUpdating: boolean;
};

export function OrdersTable({ orders, isUpdating }: OrdersTableProps) {
  return (
    <div className={isUpdating ? "table-wrap table-wrap--updating" : "table-wrap"}>
      <table className="orders-table" data-updating={isUpdating ? "true" : "false"}>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
            <th scope="col">Amount</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="mono">{order.orderNumber}</td>
              <td>{order.customerName}</td>
              <td className="mono orders-email">{order.customerEmail}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="mono">{formatAmount(order)}</td>
              <td className="mono">{formatDateTime(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
