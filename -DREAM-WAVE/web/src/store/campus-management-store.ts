"use client";

import { CAMPUS_SEED } from "@/constants/campus-management-seed";
import { EMPTY_CAMPUS_STATE } from "@/constants/institution-empty-state";
import { STORAGE_KEYS } from "@/constants/storage";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  Announcement,
  CampusEvent,
  CampusNews,
  CampusState,
  GalleryAlbum,
  StudentClub,
} from "@/types/campus-management";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

type CampusStore = CampusState & {
  hydrated: boolean;
  hydrate: () => void;
  upsertAnnouncement: (record: Announcement) => void;
  removeAnnouncement: (id: string) => void;
  togglePin: (id: string) => void;
  upsertEvent: (record: CampusEvent) => void;
  removeEvent: (id: string) => void;
  registerEvent: (id: string) => void;
  cancelRegistration: (id: string) => void;
  upsertClub: (record: StudentClub) => void;
  removeClub: (id: string) => void;
  upsertAlbum: (record: GalleryAlbum) => void;
  removeAlbum: (id: string) => void;
  upsertNews: (record: CampusNews) => void;
  removeNews: (id: string) => void;
};

function persist(state: CampusState) {
  setJsonStorageItem(STORAGE_KEYS.institutionCampus, state);
}

function snapshot(store: CampusStore): CampusState {
  return {
    announcements: store.announcements,
    events: store.events,
    clubs: store.clubs,
    albums: store.albums,
    news: store.news,
  };
}

function upsertById<T extends { id: string }>(list: T[], record: T): T[] {
  return list.some((item) => item.id === record.id)
    ? list.map((item) => (item.id === record.id ? record : item))
    : [record, ...list];
}

export const useCampusManagementStore = createAppStore<CampusStore>(
  (set, get) => {
    const commit = (patch: Partial<CampusState>) => {
      set(patch);
      persist(snapshot({ ...get(), ...patch } as CampusStore));
    };

    return {
      ...(isInstitutionDemoDataEnabled() ? CAMPUS_SEED : EMPTY_CAMPUS_STATE),
      hydrated: false,
      hydrate: () => {
        const stored = getJsonStorageItem<CampusState>(
          STORAGE_KEYS.institutionCampus,
        );
        set(
          stored && Array.isArray(stored.announcements)
            ? { ...stored, hydrated: true }
            : {
                ...(isInstitutionDemoDataEnabled() ? CAMPUS_SEED : EMPTY_CAMPUS_STATE),
                hydrated: true,
              },
        );
      },
      upsertAnnouncement: (record) =>
        commit({ announcements: upsertById(get().announcements, record) }),
      removeAnnouncement: (id) =>
        commit({ announcements: get().announcements.filter((item) => item.id !== id) }),
      togglePin: (id) =>
        commit({
          announcements: get().announcements.map((item) =>
            item.id === id ? { ...item, pinned: !item.pinned } : item,
          ),
        }),
      upsertEvent: (record) => commit({ events: upsertById(get().events, record) }),
      removeEvent: (id) =>
        commit({ events: get().events.filter((item) => item.id !== id) }),
      registerEvent: (id) =>
        commit({
          events: get().events.map((item) =>
            item.id === id
              ? { ...item, registered: Math.min(item.capacity, item.registered + 1) }
              : item,
          ),
        }),
      cancelRegistration: (id) =>
        commit({
          events: get().events.map((item) =>
            item.id === id
              ? { ...item, registered: Math.max(0, item.registered - 1) }
              : item,
          ),
        }),
      upsertClub: (record) => commit({ clubs: upsertById(get().clubs, record) }),
      removeClub: (id) =>
        commit({ clubs: get().clubs.filter((item) => item.id !== id) }),
      upsertAlbum: (record) => commit({ albums: upsertById(get().albums, record) }),
      removeAlbum: (id) =>
        commit({ albums: get().albums.filter((item) => item.id !== id) }),
      upsertNews: (record) => commit({ news: upsertById(get().news, record) }),
      removeNews: (id) =>
        commit({ news: get().news.filter((item) => item.id !== id) }),
    };
  },
);
