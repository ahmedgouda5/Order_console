import { ORDER_STATUSES } from "../types/orders.types";
import type { OrderStatus } from "../types/orders.types";

type OrderStatusFilterProps = {
  value: OrderStatus | null;
  onChange: (nextStatus: OrderStatus | null) => void;
};

export function OrderStatusFilter({
  value,
  onChange,
}: OrderStatusFilterProps) {
  return (
    <label className="select-label">
      <span>Status</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? null : (next as OrderStatus));
        }}
      >
        <option value="">All statuses</option>
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}
