import { useState } from "react";
import { Link } from "react-router";

import { OrdersErrorState } from "../components/OrdersErrorState";
import { OrdersEmptyState } from "../components/OrdersEmptyState";
import { OrdersLoadingSkeleton } from "../components/OrdersLoadingSkeleton";
import { OrdersPagination } from "../components/OrdersPagination";
import { OrdersTable } from "../components/OrdersTable";
import { OrderSearchInput } from "../components/OrderSearchInput";
import { OrderStatusFilter } from "../components/OrderStatusFilter";
import { OrderSortControls } from "../components/OrderSortControls";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useOrdersQuery } from "../hooks/useOrdersQuery";
import type {
  OrderSortDirection,
  OrderSortField,
} from "../types/orders.types";
import type { OrderStatus } from "../types/orders.types";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_SORT_BY: OrderSortField = "createdAt";
const DEFAULT_SORT_ORDER: OrderSortDirection = "desc";

export function OrdersListPage() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [sortBy, setSortBy] = useState<OrderSortField>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<OrderSortDirection>(DEFAULT_SORT_ORDER);
  const [page, setPage] = useState(1);
  const [lastCommitted, setLastCommitted] = useState({
    search: debouncedSearch,
    status,
    sortBy,
    sortOrder,
  });

  const committedFiltersChanged =
    lastCommitted.search !== debouncedSearch
    || lastCommitted.status !== status
    || lastCommitted.sortBy !== sortBy
    || lastCommitted.sortOrder !== sortOrder;

  if (committedFiltersChanged) {
    setLastCommitted({ search: debouncedSearch, status, sortBy, sortOrder });

    if (page !== 1) {
      setPage(1);
    }
  }

  const { data, isInitialLoading, isFetching, error, refetch } = useOrdersQuery({
    page,
    search: debouncedSearch,
    status,
    sortBy,
    sortOrder,
  });

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  const resetFilters = () => {
    setSearchInput("");
    setStatus(null);
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
  };

  const showInitialSkeleton = isInitialLoading && data === null && error === null;
  const showEmptyState = !showInitialSkeleton && error === null && orders.length === 0;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="muted">
            Browse orders with server-side search, status filtering and sorting.
          </p>
        </div>
        <Link to="/orders/new" className="button">
          + New order
        </Link>
      </header>

      <div className="toolbar card">
        <OrderSearchInput value={searchInput} onSearchChange={setSearchInput} isSearching={isFetching} />
        <OrderStatusFilter value={status} onChange={setStatus} />
        <OrderSortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onChange={(nextBy, nextDirection) => {
            setSortBy(nextBy);
            setSortOrder(nextDirection);
          }}
        />
      </div>

      {error !== null && data === null && (
        <OrdersErrorState error={error} onRetry={refetch} />
      )}

      {error !== null && data !== null && (
        <OrdersErrorState error={error} onRetry={refetch} variant="banner" />
      )}

      {showInitialSkeleton ? (
        <OrdersLoadingSkeleton />
      ) : showEmptyState ? (
        <OrdersEmptyState
          message={
            debouncedSearch || status
              ? `No orders match "${debouncedSearch || "the current filters"}". Adjust the search or status filter.`
              : "There are no orders in the system yet."
          }
          onResetFilters={debouncedSearch || status ? resetFilters : undefined}
        />
      ) : (
        pagination && (
          <>
            <OrdersTable orders={orders} isUpdating={isFetching} />
            <OrdersPagination
              pagination={pagination}
              onPageChange={setPage}
              isFetching={isFetching}
            />
          </>
        )
      )}
    </section>
  );
}
