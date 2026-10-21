import type { ChangeEvent } from "react";

type OrderSearchInputProps = {
  value: string;
  onSearchChange: (nextValue: string) => void;
  isSearching: boolean;
};

export function OrderSearchInput({
  value,
  onSearchChange,
  isSearching,
}: OrderSearchInputProps) {
  return (
    <label className="search-input">
      <span className="visually-hidden">Search orders</span>
      <input
        type="search"
        name="search"
        placeholder="Search by customer name or email…"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onSearchChange(event.target.value)
        }
        aria-label="Search orders by customer name or email"
      />
      {isSearching && (
        <span className="spinner spinner--small" aria-hidden="true" />
      )}
    </label>
  );
}
