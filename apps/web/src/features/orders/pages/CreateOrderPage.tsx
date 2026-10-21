import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import {
  createOrderFormSchema,
  flattenZodIssues,
} from "../schemas/createOrder.schema";
import type { CreateOrderFields } from "../schemas/createOrder.schema";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "../types/orders.types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "SAR", "AED"] as const;

const EMPTY_FIELDS: CreateOrderFields = {
  customerName: "",
  customerEmail: "",
  status: "PENDING",
  amount: "",
  currency: "USD",
};

export function CreateOrderPage() {
  const [fields, setFields] = useState<CreateOrderFields>(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { result, isSubmitting, error, submit, reset } = useCreateOrderMutation();

  const setField = <K extends keyof CreateOrderFields>(
    key: K,
    value: CreateOrderFields[K],
  ) => {
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = createOrderFormSchema.safeParse({
      customerName: fields.customerName,
      customerEmail: fields.customerEmail,
      status: fields.status,
      amount: fields.amount,
      currency: fields.currency,
    });

    if (!parsed.success) {
      setFieldErrors(flattenZodIssues(parsed.error));
      return;
    }

    setFieldErrors({});

    const created = await submit(
      {
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        status: parsed.data.status,
        amount: parsed.data.amount.toFixed(2),
        currency: parsed.data.currency,
        idempotencyKey: crypto.randomUUID(),
      },
    );

    if (created) {
      setFields(EMPTY_FIELDS);
    }
  };

  const renderFieldError = (fieldName: string) => {
    const messages = fieldErrors[fieldName];

    return messages?.length ? (
      <span className="error-text" role="alert">
        {messages.join(" ")}
      </span>
    ) : null;
  };

  return (
    <section className="page page--narrow">
      <header className="page-header">
        <div>
          <h1>Create order</h1>
          <p className="muted">
            New orders are protected against duplicate submissions by an idempotency key.
          </p>
        </div>
        <Link to="/orders" className="button button--secondary">
          ← Back to orders
        </Link>
      </header>

      {result !== null ? (
        <div className="card success-card" role="status">
          <h2>Order created</h2>
          <p className="muted">{result.message}</p>
          <p>
            Order <strong className="mono">{result.order.orderNumber}</strong> for{" "}
            <strong>{result.order.customerName}</strong> ({result.order.status},{" "}
            {result.order.amount} {result.order.currency}).
          </p>
          <div className="success-actions">
            <Link to="/orders" className="button">
              View orders list
            </Link>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                reset();
                setFields(EMPTY_FIELDS);
                setFieldErrors({});
              }}
            >
              Create another order
            </button>
          </div>
        </div>
      ) : (
        <form className="card order-form" onSubmit={handleSubmit} noValidate>
          {error !== null && (
            <div className="alert alert--error" role="alert">
              {error.message}
            </div>
          )}

          <label className="field">
            <span className="field-label">Customer name</span>
            <input
              name="customerName"
              value={fields.customerName}
              onChange={(event) => setField("customerName", event.target.value)}
              disabled={isSubmitting}
              aria-invalid={fieldErrors.customerName !== undefined}
            />
            {renderFieldError("customerName")}
          </label>

          <label className="field">
            <span className="field-label">Customer email</span>
            <input
              type="email"
              name="customerEmail"
              value={fields.customerEmail}
              onChange={(event) => setField("customerEmail", event.target.value)}
              disabled={isSubmitting}
              aria-invalid={fieldErrors.customerEmail !== undefined}
            />
            {renderFieldError("customerEmail")}
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Status</span>
              <select
                name="status"
                value={fields.status}
                onChange={(event) => setField("status", event.target.value as OrderStatus)}
                disabled={isSubmitting}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Currency</span>
              <select
                name="currency"
                value={fields.currency}
                onChange={(event) => setField("currency", event.target.value.toUpperCase())}
                disabled={isSubmitting}
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              name="amount"
              min="0.01"
              step="0.01"
              value={fields.amount}
              onChange={(event) => setField("amount", event.target.value)}
              disabled={isSubmitting}
              aria-invalid={fieldErrors.amount !== undefined}
            />
            {renderFieldError("amount")}
          </label>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating order…" : "Create order"}
          </button>
          <p className="muted form-hint">
            Each submission sends a unique {`Idempotency-Key`} header; accidental double
            submissions cannot create duplicate orders — enforced by the backend.
          </p>
        </form>
      )}
    </section>
  );
}
