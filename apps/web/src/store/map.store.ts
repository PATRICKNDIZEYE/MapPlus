import { create } from 'zustand';

interface SelectedShop {
  shopId: string;
  shopName: string;
  unitId: string;
  unitCode: string;
  category: string | null;
}

/**
 * The user's chosen entrance — where they physically are inside the
 * building right now. Persisted to localStorage per-building so picking
 * the entrance is a one-time action.
 */
interface UserAnchor {
  id:          string;           // synthetic id, e.g. "entrance-N"
  label:       string;           // "North entrance"
  coordinates: [number, number]; // [lng, lat]
}

interface MapStore {
  // Active building and floor
  activeBuildingId: string | null;
  activeFloorId: string | null;
  activeFloorNumber: number | null;

  // User's "you are here" anchor — set via EntrancePicker or QR scan
  userAnchor: UserAnchor | null;

  // Selected shop from map click or search
  selectedShop: SelectedShop | null;

  // Route state
  routeDestinationShopId: string | null;
  routeVisible: boolean;

  // Search
  searchQuery: string;
  searchOpen: boolean;

  actions: {
    setActiveFloor: (floorId: string, floorNumber: number) => void;
    setActiveBuilding: (buildingId: string) => void;
    setUserAnchor: (anchor: UserAnchor | null) => void;
    selectShop: (shop: SelectedShop | null) => void;
    setRoute: (destinationShopId: string | null) => void;
    clearRoute: () => void;
    setSearch: (query: string) => void;
    openSearch: () => void;
    closeSearch: () => void;
  };
}

const ANCHOR_STORAGE_KEY = 'mg.userAnchor';

function loadAnchor(): UserAnchor | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ANCHOR_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserAnchor) : null;
  } catch {
    return null;
  }
}

function saveAnchor(anchor: UserAnchor | null) {
  if (typeof window === 'undefined') return;
  try {
    if (anchor) window.localStorage.setItem(ANCHOR_STORAGE_KEY, JSON.stringify(anchor));
    else        window.localStorage.removeItem(ANCHOR_STORAGE_KEY);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const useMapStore = create<MapStore>((set) => ({
  activeBuildingId: null,
  activeFloorId: null,
  activeFloorNumber: null,
  userAnchor: loadAnchor(),
  selectedShop: null,
  routeDestinationShopId: null,
  routeVisible: false,
  searchQuery: '',
  searchOpen: false,

  actions: {
    setActiveFloor: (floorId, floorNumber) =>
      set({ activeFloorId: floorId, activeFloorNumber: floorNumber }),

    setActiveBuilding: (buildingId) => set({ activeBuildingId: buildingId }),

    setUserAnchor: (anchor) => {
      saveAnchor(anchor);
      set({ userAnchor: anchor });
    },

    selectShop: (shop) =>
      set((state) => {
        // Switching shops (or closing the panel) invalidates any active
        // route — keep map state coherent: route arrows shouldn't point
        // at the previous selection.
        if (state.selectedShop?.shopId !== shop?.shopId) {
          return {
            selectedShop: shop,
            routeVisible: false,
            routeDestinationShopId: null,
          };
        }
        return { selectedShop: shop };
      }),

    setRoute: (destinationShopId) =>
      set({ routeDestinationShopId: destinationShopId, routeVisible: true }),

    clearRoute: () =>
      set({ routeDestinationShopId: null, routeVisible: false }),

    setSearch: (query) => set({ searchQuery: query }),

    openSearch: () => set({ searchOpen: true }),

    closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  },
}));

// Selector helpers — use these instead of selecting the whole store
export const useActiveFloorId = () => useMapStore((s) => s.activeFloorId);
export const useSelectedShop = () => useMapStore((s) => s.selectedShop);
export const useRouteVisible = () => useMapStore((s) => s.routeVisible);
export const useUserAnchor   = () => useMapStore((s) => s.userAnchor);
export const useRouteDestinationShopId = () => useMapStore((s) => s.routeDestinationShopId);
export const useMapActions = () => useMapStore((s) => s.actions);
