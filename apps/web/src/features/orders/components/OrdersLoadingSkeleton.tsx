export function OrdersLoadingSkeleton() {
  return (
    <div className="table-wrap" aria-busy="true" aria-live="polite">
      <table className="orders-table skeleton-table">
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
          {Array.from({ length: 10 }, (_, index) => (
            <tr key={index}>
              {Array.from({ length: 6 }, (_, cell) => (
                <td key={cell}>
                  <span className="skeleton-line" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
