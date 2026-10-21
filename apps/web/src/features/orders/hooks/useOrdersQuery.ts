import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  HttpError,
  isAbortedRequest,
} from "../../../lib/http";
import { listOrders } from "../api/orders.api";
import type { OrdersPage, OrdersQueryParams } from "../types/orders.types";

type QueryState = {
  data: OrdersPage | null;
  isInitialLoading: boolean;
  isFetching: boolean;
  error: HttpError | Error | null;
};

type QueryAction =
  | { type: "start" }
  | { type: "success"; result: OrdersPage }
  | { type: "failure"; error: HttpError | Error };

const QUERY_INITIAL_STATE: QueryState = {
  data: null,
  isInitialLoading: true,
  isFetching: false,
  error: null,
};

function queryReducer(state: QueryState, action: QueryAction): QueryState {
  switch (action.type) {
    case "start": {
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    }
    case "success": {
      return {
        data: action.result,
        isInitialLoading: false,
        isFetching: false,
        error: null,
      };
    }
    case "failure": {
      return {
        ...state,
        isInitialLoading: false,
        isFetching: false,
        error: action.error,
      };
    }
    default: {
      return state;
    }
  }
}

function normalizeQueryError(queryError: unknown): HttpError | Error {
  return queryError instanceof Error
    ? queryError
    : new Error("Unknown error while fetching orders");
}

export type OrdersQueryStates = {
  data: OrdersPage | null;
  isInitialLoading: boolean;
  isFetching: boolean;
  error: HttpError | Error | null;
  refetch: () => void;
};

export function useOrdersQuery(params: OrdersQueryParams): OrdersQueryStates {
  const [state, dispatch] = useReducer(queryReducer, QUERY_INITIAL_STATE);

  const abortRef = useRef<AbortController | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);
  const refetch = useCallback(() => {
    setRefetchTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    let effectCancelled = false;

    dispatch({ type: "start" });

    listOrders(
      {
        page: params.page,
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      controller.signal,
    )
      .then((result) => {
        if (effectCancelled || controller.signal.aborted) {
          return;
        }

        dispatch({ type: "success", result });
      })
      .catch((queryError: unknown) => {
        if (effectCancelled || isAbortedRequest(queryError)) {
          return;
        }

        dispatch({ type: "failure", error: normalizeQueryError(queryError) });
      });

    return () => {
      effectCancelled = true;
      controller.abort();
    };
  }, [
    params.page,
    params.search,
    params.status,
    params.sortBy,
    params.sortOrder,
    refetchTick,
  ]);

  return { ...state, refetch };
}
