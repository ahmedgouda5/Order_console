import type { OrdersPagination } from "../types/orders.types";

type OrdersPaginationProps = {
  pagination: OrdersPagination;
  onPageChange: (nextPage: number) => void;
  isFetching: boolean;
};

export function OrdersPagination({
  pagination,
  onPageChange,
  isFetching,
}: OrdersPaginationProps) {
  return (
    <nav className="pagination" aria-label="Orders pagination">
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={!pagination.hasPreviousPage || isFetching}
      >
        ← Previous
      </button>

      <span className="pagination-status">
        Page{" "}
        <strong>{pagination.page.toLocaleString()}</strong>
        {" "}of{" "}
        <strong>{pagination.totalPages.toLocaleString()}</strong>
        {" "}· {pagination.total.toLocaleString()} orders
      </span>

      <button
        type="button"
        className="button button--secondary"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={!pagination.hasNextPage || isFetching}
      >
        Next →
      </button>
    </nav>
  );
}
