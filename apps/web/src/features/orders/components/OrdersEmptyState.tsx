type OrdersEmptyStateProps = {
  message: string;
  onResetFilters?: () => void;
};

export function OrdersEmptyState({ message, onResetFilters }: OrdersEmptyStateProps) {
  return (
    <div className="state-panel">
      <h2>No orders found</h2>
      <p className="muted">{message}</p>
      {onResetFilters && (
        <button type="button" className="button button--secondary" onClick={onResetFilters}>
          Clear search and filters
        </button>
      )}
    </div>
  );
}
