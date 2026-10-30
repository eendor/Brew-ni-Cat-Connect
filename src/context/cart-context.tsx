"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  buildCartItemKey,
  calculateLineTotal,
  isSafeCartSubtotal,
  isSafeLineQuantity,
  normalizeFlavor,
} from "@/lib/ordering/cart-pricing";
import {
  addCatalogSelection,
  cartReducer,
  createInitialCartState,
  isFulfillmentType,
  replaceCatalogSelection,
} from "@/lib/ordering/cart-reducer";
import {
  buildOrderDraft,
  getCartItemCount,
  getCartLineCount,
  getCartLines,
  getCartSubtotal,
  isCartEmpty,
} from "@/lib/ordering/cart-selectors";
import type { MenuCatalog } from "@/types/menu";
import type {
  AddCatalogSelectionResult,
  CartAction,
  CartItem,
  CartItemSelection,
  CartLineReplacementSelection,
  CartState,
  FulfillmentType,
  OrderDraft,
  ReplaceCatalogSelectionResult,
} from "@/types/ordering";

export const CART_STORAGE_KEY = "brew_ni_cat_cart_v1";

/**
 * Validate and sanitize cart state retrieved from storage.
 * Corrupted or tampered records fall back safely to null.
 */
export function validateStoredCartState(raw: unknown): CartState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as { lines?: unknown; fulfillment?: unknown };
  if (
    !Array.isArray(candidate.lines) ||
    !isFulfillmentType(candidate.fulfillment)
  ) {
    return null;
  }

  const validatedLines: CartItem[] = [];
  for (const entry of candidate.lines) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item.key !== "string" ||
      typeof item.itemId !== "string" ||
      typeof item.itemName !== "string" ||
      typeof item.variantId !== "string" ||
      typeof item.variantName !== "string" ||
      typeof item.unitPrice !== "number" ||
      typeof item.quantity !== "number" ||
      typeof item.lineTotal !== "number"
    ) {
      return null;
    }

    if (!isSafeLineQuantity(item.unitPrice, item.quantity)) {
      return null;
    }

    const flavor = normalizeFlavor(item.flavor as string | null | undefined);
    const expectedKey = buildCartItemKey(item.itemId, item.variantId, flavor);
    if (item.key !== expectedKey) {
      return null;
    }

    const expectedLineTotal = calculateLineTotal(item.unitPrice, item.quantity);
    if (item.lineTotal !== expectedLineTotal) {
      return null;
    }

    validatedLines.push({
      key: item.key,
      itemId: item.itemId,
      itemName: item.itemName,
      variantId: item.variantId,
      variantName: item.variantName,
      flavor,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: expectedLineTotal,
    });
  }

  if (!isSafeCartSubtotal(validatedLines)) {
    return null;
  }

  return {
    lines: validatedLines,
    fulfillment: candidate.fulfillment,
  };
}

export type CartStore = Readonly<{
  getSnapshot: () => CartState;
  getServerSnapshot: () => CartState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: CartAction) => CartState;
  setDirectState: (next: CartState) => void;
}>;

export function createCartStore(
  initialState?: CartState,
  storageKey = CART_STORAGE_KEY,
): CartStore {
  const serverSnapshot: CartState = initialState ?? createInitialCartState();
  let currentState: CartState = serverSnapshot;
  const listeners = new Set<() => void>();

  function loadFromStorage(): CartState {
    if (typeof window === "undefined") {
      return serverSnapshot;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        const validated = validateStoredCartState(parsed);
        if (validated) {
          return validated;
        }
      }
    } catch {
      // Storage unavailable or unparseable; use default snapshot
    }
    return serverSnapshot;
  }

  if (initialState) {
    currentState = initialState;
    persist(initialState);
  } else if (typeof window !== "undefined") {
    currentState = loadFromStorage();
  }

  function persist(state: CartState) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Ignore quota/storage errors
      }
    }
  }

  return {
    getSnapshot: () => currentState,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      function handleStorage(event: StorageEvent) {
        if (event.key !== storageKey) {
          return;
        }
        if (!event.newValue) {
          currentState = createInitialCartState();
        } else {
          try {
            const parsed = JSON.parse(event.newValue) as unknown;
            const validated = validateStoredCartState(parsed);
            if (validated) {
              currentState = validated;
            }
          } catch {
            // Ignore unparseable external changes
          }
        }
        listener();
      }

      if (typeof window !== "undefined") {
        window.addEventListener("storage", handleStorage);
      }

      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", handleStorage);
        }
      };
    },
    dispatch: (action: CartAction): CartState => {
      const next = cartReducer(currentState, action);
      if (next !== currentState) {
        currentState = next;
        persist(next);
        listeners.forEach((l) => l());
      }
      return next;
    },
    setDirectState: (next: CartState) => {
      if (next !== currentState) {
        currentState = next;
        persist(next);
        listeners.forEach((l) => l());
      }
    },
  };
}

export type CartRevalidationResult = Readonly<{
  state: CartState;
  repricedCount: number;
  removedCount: number;
  warnings: readonly string[];
}>;

export function revalidateCartWithCatalog(
  currentState: CartState,
  catalog: MenuCatalog,
): CartRevalidationResult {
  let nextState: CartState = {
    lines: [],
    fulfillment: currentState.fulfillment,
  };

  let repricedCount = 0;
  let removedCount = 0;
  const warnings: string[] = [];

  for (const line of currentState.lines) {
    const result = addCatalogSelection(nextState, catalog, {
      itemId: line.itemId,
      variantId: line.variantId,
      flavor: line.flavor,
      quantity: line.quantity,
    });

    if (result.ok) {
      const addedLine = result.state.lines.find((l) => l.key === line.key);
      if (addedLine && addedLine.unitPrice !== line.unitPrice) {
        repricedCount++;
        warnings.push(
          `Price for ${line.itemName} (${line.variantName}) was updated to the current menu price.`,
        );
      }
      nextState = result.state;
    } else {
      removedCount++;
      warnings.push(
        `${line.itemName} (${line.variantName}) is no longer available and was removed from your cart.`,
      );
    }
  }

  return {
    state: nextState,
    repricedCount,
    removedCount,
    warnings,
  };
}

export type CartContextValue = Readonly<{
  state: CartState;
  lines: readonly CartItem[];
  fulfillment: FulfillmentType;
  subtotal: number;
  lineCount: number;
  itemCount: number;
  isEmpty: boolean;
  draft: OrderDraft;
  isHydrated: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (
    catalog: MenuCatalog,
    selection: CartItemSelection,
  ) => AddCatalogSelectionResult;
  replaceLine: (
    catalog: MenuCatalog,
    key: string,
    selection: CartLineReplacementSelection,
  ) => ReplaceCatalogSelectionResult;
  revalidateWithCatalog: (catalog: MenuCatalog) => CartRevalidationResult;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  setFulfillment: (fulfillment: FulfillmentType) => void;
  /** Empties the cart; offers an undo unless `undoable` is false. */
  clearCart: (options?: Readonly<{ undoable?: boolean }>) => void;
  /**
   * Puts back a cart saved earlier, such as the one in an order summary.
   * It is checked like a cart read from storage; false means it was not
   * valid and the cart is unchanged.
   */
  restoreCart: (snapshot: CartState) => boolean;
  /** Last removal that can still be undone (shown as a toast for ~5 s). */
  undo: Readonly<{ id: number; message: string }> | null;
  undoLast: () => void;
  dismissUndo: () => void;
}>;

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = Readonly<{
  children: ReactNode;
  initialState?: CartState;
  storageKey?: string;
}>;

export function CartProvider({
  children,
  initialState,
  storageKey = CART_STORAGE_KEY,
}: CartProviderProps) {
  const store = useMemo(
    () => createCartStore(initialState, storageKey),
    [initialState, storageKey],
  );

  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(
    () => setIsDrawerOpen((current) => !current),
    [],
  );

  const addItem = useCallback(
    (
      catalog: MenuCatalog,
      selection: CartItemSelection,
    ): AddCatalogSelectionResult => {
      const current = store.getSnapshot();
      const result = addCatalogSelection(current, catalog, selection);
      if (result.ok) {
        store.setDirectState(result.state);
      }
      return result;
    },
    [store],
  );

  const replaceLine = useCallback(
    (
      catalog: MenuCatalog,
      key: string,
      selection: CartLineReplacementSelection,
    ): ReplaceCatalogSelectionResult => {
      const current = store.getSnapshot();
      const result = replaceCatalogSelection(current, catalog, key, selection);
      if (result.ok) {
        store.setDirectState(result.state);
      }
      return result;
    },
    [store],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      store.dispatch({ type: "update-quantity", key, quantity });
    },
    [store],
  );

  const [undoEntry, setUndoEntry] = useState<{
    id: number;
    message: string;
    snapshot: CartState;
  } | null>(null);

  const removeItem = useCallback(
    (key: string) => {
      const before = store.getSnapshot();
      const line = before.lines.find((entry) => entry.key === key);
      store.dispatch({ type: "remove", key });
      if (line && store.getSnapshot() !== before) {
        setUndoEntry({
          id: Date.now(),
          message: `Removed ${line.itemName}`,
          snapshot: before,
        });
      }
    },
    [store],
  );

  const setFulfillment = useCallback(
    (fulfillment: FulfillmentType) => {
      store.dispatch({ type: "set-fulfillment", fulfillment });
    },
    [store],
  );

  const clearCart = useCallback(
    (options?: Readonly<{ undoable?: boolean }>) => {
      const before = store.getSnapshot();
      store.dispatch({ type: "clear" });
      if (options?.undoable !== false && before.lines.length > 0) {
        setUndoEntry({
          id: Date.now(),
          message: "Cart cleared",
          snapshot: before,
        });
      } else {
        setUndoEntry(null);
      }
    },
    [store],
  );

  const restoreCart = useCallback(
    (snapshot: CartState) => {
      // the checkout rechecks these prices against the menu afterwards
      const validated = validateStoredCartState(snapshot);
      if (!validated) return false;
      store.setDirectState(validated);
      setUndoEntry(null);
      return true;
    },
    [store],
  );

  const undoLast = useCallback(() => {
    if (!undoEntry) return;
    // the snapshot was a valid, already-priced cart state
    store.setDirectState(undoEntry.snapshot);
    setUndoEntry(null);
  }, [store, undoEntry]);
  const dismissUndo = useCallback(() => setUndoEntry(null), []);
  const undo = useMemo(
    () => (undoEntry ? { id: undoEntry.id, message: undoEntry.message } : null),
    [undoEntry],
  );

  const lines = useMemo(() => getCartLines(state), [state]);
  const fulfillment = state.fulfillment;
  const subtotal = useMemo(() => getCartSubtotal(state), [state]);
  const lineCount = useMemo(() => getCartLineCount(state), [state]);
  const itemCount = useMemo(() => getCartItemCount(state), [state]);
  const isEmpty = useMemo(() => isCartEmpty(state), [state]);
  const draft = useMemo(() => buildOrderDraft(state), [state]);

  const revalidateWithCatalog = useCallback(
    (catalog: MenuCatalog): CartRevalidationResult => {
      const current = store.getSnapshot();
      const outcome = revalidateCartWithCatalog(current, catalog);
      store.setDirectState(outcome.state);
      return outcome;
    },
    [store],
  );

  const contextValue = useMemo<CartContextValue>(
    () => ({
      state,
      lines,
      fulfillment,
      subtotal,
      lineCount,
      itemCount,
      isEmpty,
      draft,
      isHydrated: true,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      replaceLine,
      revalidateWithCatalog,
      updateQuantity,
      removeItem,
      setFulfillment,
      clearCart,
      restoreCart,
      undo,
      undoLast,
      dismissUndo,
    }),
    [
      state,
      lines,
      fulfillment,
      subtotal,
      lineCount,
      itemCount,
      isEmpty,
      draft,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      replaceLine,
      revalidateWithCatalog,
      updateQuantity,
      removeItem,
      setFulfillment,
      clearCart,
      restoreCart,
      undo,
      undoLast,
      dismissUndo,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

const fallbackCartValue: CartContextValue = {
  state: createInitialCartState(),
  lines: [],
  fulfillment: "pickup",
  subtotal: 0,
  lineCount: 0,
  itemCount: 0,
  isEmpty: true,
  draft: buildOrderDraft(createInitialCartState()),
  isHydrated: false,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
  addItem: () => ({
    ok: false,
    state: createInitialCartState(),
    reason: "item-unavailable",
    message: "Cart provider not available",
  }),
  replaceLine: () => ({
    ok: false,
    state: createInitialCartState(),
    reason: "item-unavailable",
    message: "Cart provider not available",
  }),
  revalidateWithCatalog: () => ({
    state: createInitialCartState(),
    repricedCount: 0,
    removedCount: 0,
    warnings: [],
  }),
  updateQuantity: () => {},
  removeItem: () => {},
  setFulfillment: () => {},
  clearCart: () => {},
  restoreCart: () => false,
  undo: null,
  undoLast: () => {},
  dismissUndo: () => {},
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  return context ?? fallbackCartValue;
}
