import { create, type StateCreator } from "zustand";

/**
 * Dream Wave — Zustand architecture preparation.
 *
 * No business stores in the foundation phase.
 * Use `createAppStore` as the standard factory for future feature stores.
 */

export function createAppStore<TState extends object>(
  initializer: StateCreator<TState>,
) {
  return create<TState>()(initializer);
}

/**
 * UI shell store placeholder — intentionally empty.
 * Feature state belongs in dedicated stores under this folder later.
 */
type UiShellState = {
  _foundationReady: true;
};

export const useUiShellStore = createAppStore<UiShellState>(() => ({
  _foundationReady: true,
}));
