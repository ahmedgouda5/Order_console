import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, isAbortedRequest } from "../../../lib/http";
import { createOrder } from "../api/orders.api";
import type { CreatedOrderResponse } from "../types/orders.types";

export type CreateOrderStates = {
  result: CreatedOrderResponse | null;
  isSubmitting: boolean;
  error: HttpError | Error | null;
  submit: (payload: Parameters<typeof createOrder>[0]) => Promise<boolean>;
  reset: () => void;
};

export function useCreateOrderMutation(): CreateOrderStates {
  const [result, setResult] = useState<CreatedOrderResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<HttpError | Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const submit = useCallback(
    async (payload: Parameters<typeof createOrder>[0]) => {
      if (isSubmitting) {
        return false;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSubmitting(true);
      setError(null);

      try {
        const created = await createOrder(payload, controller.signal);

        if (!controller.signal.aborted) {
          setResult(created);
        }

        return true;
      } catch (submitError: unknown) {
        if (isAbortedRequest(submitError)) {
          return false;
        }

        setError(
          submitError instanceof Error
            ? submitError
            : new Error("Unknown error while creating the order"),
        );

        return false;
      } finally {
        if (!controller.signal.aborted) {
          setIsSubmitting(false);
        }
      }
    },
    [isSubmitting],
  );

  return { result, isSubmitting, error, submit, reset };
}
