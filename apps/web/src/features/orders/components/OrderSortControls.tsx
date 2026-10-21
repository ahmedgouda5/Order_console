import {
  ORDER_SORT_FIELDS,
  type OrderSortDirection,
  type OrderSortField,
} from "../types/orders.types";

type OrderSortControlsProps = {
  sortBy: OrderSortField;
  sortOrder: OrderSortDirection;
  onChange: (nextBy: OrderSortField, nextDirection: OrderSortDirection) => void;
};

const FIELD_LABELS: Record<OrderSortField, string> = {
  createdAt: "Created at",
  amount: "Amount",
};

export function OrderSortControls({
  sortBy,
  sortOrder,
  onChange,
}: OrderSortControlsProps) {
  return (
    <div className="sort-controls" role="group" aria-label="Sort orders">
      <label className="select-label">
        <span>Sort by</span>
        <select
          value={sortBy}
          onChange={(event) => {
            const nextBy = event.target.value as OrderSortField;
            onChange(nextBy, sortOrder);
          }}
        >
          {ORDER_SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {FIELD_LABELS[field]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="button button--secondary"
        onClick={() => {
          onChange(sortBy, sortOrder === "asc" ? "desc" : "asc");
        }}
        aria-label={`Currently sorting ${sortOrder === "asc" ? "ascending" : "descending"}. Toggle direction.`}
      >
        {sortOrder === "asc" ? "Asc ↑" : "Desc ↓"}
      </button>
    </div>
  );
}
