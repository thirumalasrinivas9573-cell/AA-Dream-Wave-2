"use client";

import { SEED_PERSONALIZATION } from "@/constants/personalization";
import { STORAGE_KEYS } from "@/constants/storage";
import { createAppStore } from "@/store";
import type {
  AccentColor,
  DashboardWidgetId,
  PersonalizationState,
  SmartNotification,
} from "@/types/personalization";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function loadState(): PersonalizationState {
  const stored = getJsonStorageItem<PersonalizationState>(
    STORAGE_KEYS.personalizationData,
  );
  if (stored && Array.isArray(stored.widgetOrder)) {
    return {
      ...structuredClone(SEED_PERSONALIZATION),
      ...stored,
      widgets:
        Array.isArray(stored.widgets) && stored.widgets.length > 0
          ? stored.widgets
          : structuredClone(SEED_PERSONALIZATION.widgets),
      notifications:
        Array.isArray(stored.notifications) && stored.notifications.length > 0
          ? stored.notifications
          : structuredClone(SEED_PERSONALIZATION.notifications),
      quickActions:
        Array.isArray(stored.quickActions) && stored.quickActions.length > 0
          ? stored.quickActions
          : structuredClone(SEED_PERSONALIZATION.quickActions),
    };
  }
  return structuredClone(SEED_PERSONALIZATION);
}

function persist(state: PersonalizationState) {
  setJsonStorageItem(STORAGE_KEYS.personalizationData, state);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type PersonalizationStore = PersonalizationState & {
  hydrated: boolean;
  hydrate: () => void;
  setAccent: (accent: AccentColor) => void;
  setDenserLayout: (value: boolean) => void;
  toggleWidgetVisibility: (id: DashboardWidgetId) => void;
  moveWidget: (id: DashboardWidgetId, direction: "up" | "down") => void;
  reorderWidget: (fromId: DashboardWidgetId, toId: DashboardWidgetId) => void;
  toggleFavoriteSection: (id: DashboardWidgetId) => void;
  setQuickActions: (actions: Array<{ label: string; href: string }>) => void;
  resetLayout: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushSmartNotification: (
    input: Omit<SmartNotification, "id" | "createdAt" | "read">,
  ) => void;
  clearNotifications: () => void;
};

function snapshot(get: () => PersonalizationStore): PersonalizationState {
  const state = get();
  return {
    widgetOrder: state.widgetOrder,
    widgets: state.widgets,
    accent: state.accent,
    favoriteSections: state.favoriteSections,
    quickActions: state.quickActions,
    notifications: state.notifications,
    denserLayout: state.denserLayout,
  };
}

export const usePersonalizationStore = createAppStore<PersonalizationStore>(
  (set, get) => ({
    ...SEED_PERSONALIZATION,
    hydrated: false,

    hydrate: () => {
      set({ ...loadState(), hydrated: true });
    },

    setAccent: (accent) => {
      set(() => {
        const next = { ...snapshot(get), accent };
        persist(next);
        return { accent };
      });
    },

    setDenserLayout: (denserLayout) => {
      set(() => {
        const next = { ...snapshot(get), denserLayout };
        persist(next);
        return { denserLayout };
      });
    },

    toggleWidgetVisibility: (id) => {
      set((state) => {
        const widgets = state.widgets.map((widget) =>
          widget.id === id ? { ...widget, visible: !widget.visible } : widget,
        );
        const next = { ...snapshot(get), widgets };
        persist(next);
        return { widgets };
      });
    },

    moveWidget: (id, direction) => {
      set((state) => {
        const order = [...state.widgetOrder];
        const index = order.indexOf(id);
        if (index < 0) return {};
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= order.length) return {};
        const current = order[index]!;
        order[index] = order[target]!;
        order[target] = current;
        const next = { ...snapshot(get), widgetOrder: order };
        persist(next);
        return { widgetOrder: order };
      });
    },

    reorderWidget: (fromId, toId) => {
      set((state) => {
        if (fromId === toId) return {};
        const order = [...state.widgetOrder];
        const from = order.indexOf(fromId);
        const to = order.indexOf(toId);
        if (from < 0 || to < 0) return {};
        order.splice(from, 1);
        order.splice(to, 0, fromId);
        const next = { ...snapshot(get), widgetOrder: order };
        persist(next);
        return { widgetOrder: order };
      });
    },

    toggleFavoriteSection: (id) => {
      set((state) => {
        const favoriteSections = state.favoriteSections.includes(id)
          ? state.favoriteSections.filter((item) => item !== id)
          : [...state.favoriteSections, id];
        const next = { ...snapshot(get), favoriteSections };
        persist(next);
        return { favoriteSections };
      });
    },

    setQuickActions: (quickActions) => {
      set(() => {
        const next = { ...snapshot(get), quickActions };
        persist(next);
        return { quickActions };
      });
    },

    resetLayout: () => {
      set(() => {
        const next = structuredClone(SEED_PERSONALIZATION);
        persist(next);
        return next;
      });
    },

    markNotificationRead: (id) => {
      set((state) => {
        const notifications = state.notifications.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        );
        const next = { ...snapshot(get), notifications };
        persist(next);
        return { notifications };
      });
    },

    markAllNotificationsRead: () => {
      set((state) => {
        const notifications = state.notifications.map((item) => ({
          ...item,
          read: true,
        }));
        const next = { ...snapshot(get), notifications };
        persist(next);
        return { notifications };
      });
    },

    pushSmartNotification: (input) => {
      set((state) => {
        const entry: SmartNotification = {
          ...input,
          id: createId("sn"),
          createdAt: new Date().toISOString(),
          read: false,
        };
        const notifications = [entry, ...state.notifications].slice(0, 40);
        const next = { ...snapshot(get), notifications };
        persist(next);
        return { notifications };
      });
    },

    clearNotifications: () => {
      set(() => {
        const next = { ...snapshot(get), notifications: [] };
        persist(next);
        return { notifications: [] };
      });
    },
  }),
);
