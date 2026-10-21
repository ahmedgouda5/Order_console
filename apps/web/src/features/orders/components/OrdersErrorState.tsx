type OrdersErrorStateProps = {
  error: Error;
  onRetry: () => void;
  variant?: "panel" | "banner";
};

export function OrdersErrorState({
  error,
  onRetry,
  variant = "panel",
}: OrdersErrorStateProps) {
  return (
    <div
      className={variant === "panel" ? "state-panel state-panel--error" : "alert alert--error"}
      role="alert"
    >
      <div className="alert-body">
        <strong>{variant === "panel" ? "Failed to load orders" : "Orders update failed"}</strong>
        <p className="muted">{error.message}</p>
      </div>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
