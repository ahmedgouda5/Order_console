import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import {
  createOrderFormSchema,
  flattenZodIssues,
} from "../schemas/createOrder.schema";
import type {
  CreateOrderFields,
  OrderItemFormValues,
} from "../schemas/createOrder.schema";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "../types/orders.types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "SAR", "AED"] as const;

function emptyItem(): OrderItemFormValues {
  return { name: "", quantity: "1", unitPrice: "" };
}

const EMPTY_FIELDS: CreateOrderFields = {
  customerName: "",
  customerEmail: "",
  status: "PENDING",
  currency: "USD",
  items: [emptyItem()],
};

function lineTotal(item: OrderItemFormValues): number {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return quantity * unitPrice;
}

export function CreateOrderPage() {
  const [fields, setFields] = useState<CreateOrderFields>(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { result, isSubmitting, error, submit, reset } = useCreateOrderMutation();

  const orderTotal = fields.items.reduce(
    (sum, item) => sum + lineTotal(item),
    0,
  );

  const setField = <K extends keyof Omit<CreateOrderFields, "items">>(
    key: K,
    value: CreateOrderFields[K],
  ) => {
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const setItem = (
    index: number,
    key: keyof OrderItemFormValues,
    value: string,
  ) => {
    setFields((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setFields((previous) => ({
      ...previous,
      items: [...previous.items, emptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setFields((previous) => ({
      ...previous,
      items:
        previous.items.length > 1
          ? previous.items.filter((_, itemIndex) => itemIndex !== index)
          : previous.items,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = createOrderFormSchema.safeParse({
      customerName: fields.customerName,
      customerEmail: fields.customerEmail,
      status: fields.status,
      currency: fields.currency,
      items: fields.items,
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
        currency: parsed.data.currency,
        items: parsed.data.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
        })),
        amount: orderTotal.toFixed(2),
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

  const renderItemError = (index: number, fieldName: string) => {
    return renderFieldError(`items.${index}.${fieldName}`);
  };

  return (
    <section className="page page--narrow">
      <header className="page-header">
        <div>
          <h1>Create order</h1>
          <p className="muted">
            Line items are sent to the API and the server recomputes the total.
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

          <div className="items-section">
            <div className="items-header">
              <span className="field-label">Line items</span>
              <button
                type="button"
                className="button button--secondary"
                onClick={addItem}
                disabled={isSubmitting || fields.items.length >= 20}
              >
                + Add item
              </button>
            </div>

            {fieldErrors.items !== undefined && (
              <span className="error-text" role="alert">
                {fieldErrors.items.join(" ")}
              </span>
            )}

            {fields.items.map((item, index) => (
              <div className="item-row" key={index}>
                <label className="field item-name">
                  <span className="field-label">Item name</span>
                  <input
                    value={item.name}
                    onChange={(event) => setItem(index, "name", event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={fieldErrors[`items.${index}.name`] !== undefined}
                  />
                  {renderItemError(index, "name")}
                </label>

                <label className="field item-quantity">
                  <span className="field-label">Qty</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => setItem(index, "quantity", event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={fieldErrors[`items.${index}.quantity`] !== undefined}
                  />
                  {renderItemError(index, "quantity")}
                </label>

                <label className="field item-price">
                  <span className="field-label">Unit price</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => setItem(index, "unitPrice", event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={fieldErrors[`items.${index}.unitPrice`] !== undefined}
                  />
                  {renderItemError(index, "unitPrice")}
                </label>

                <span className="item-line-total mono" title="Line total">
                  {lineTotal(item).toFixed(2)}
                </span>

                <button
                  type="button"
                  className="button button--ghost item-remove"
                  onClick={() => removeItem(index)}
                  disabled={isSubmitting || fields.items.length <= 1}
                  aria-label={`Remove line item ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="order-total">
              <span>Order total</span>
              <strong className="mono">
                {orderTotal.toFixed(2)} {fields.currency}
              </strong>
            </div>
          </div>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating order…" : "Create order"}
          </button>
          <p className="muted form-hint">
            Each submission sends a unique Idempotency-Key header; accidental double
            submissions cannot create duplicate orders — enforced by the backend.
          </p>
        </form>
      )}
    </section>
  );
}
