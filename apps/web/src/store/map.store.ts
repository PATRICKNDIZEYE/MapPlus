import { create } from 'zustand';

interface SelectedShop {
  shopId: string;
  shopName: string;
  unitId: string;
  unitCode: string;
  category: string | null;
}

interface MapStore {
  // Active building and floor
  activeBuildingId: string | null;
  activeFloorId: string | null;
  activeFloorNumber: number | null;

  // User's "you are here" anchor (set after QR scan)
  userAnchorNodeId: string | null;

  // Selected shop from map click or search
  selectedShop: SelectedShop | null;

  // Route state
  routeDestinationNodeId: string | null;
  routeVisible: boolean;

  // Search
  searchQuery: string;
  searchOpen: boolean;

  actions: {
    setActiveFloor: (floorId: string, floorNumber: number) => void;
    setActiveBuilding: (buildingId: string) => void;
    setUserAnchor: (nodeId: string) => void;
    selectShop: (shop: SelectedShop | null) => void;
    setRoute: (destinationNodeId: string | null) => void;
    clearRoute: () => void;
    setSearch: (query: string) => void;
    openSearch: () => void;
    closeSearch: () => void;
  };
}

export const useMapStore = create<MapStore>((set) => ({
  activeBuildingId: null,
  activeFloorId: null,
  activeFloorNumber: null,
  userAnchorNodeId: null,
  selectedShop: null,
  routeDestinationNodeId: null,
  routeVisible: false,
  searchQuery: '',
  searchOpen: false,

  actions: {
    setActiveFloor: (floorId, floorNumber) =>
      set({ activeFloorId: floorId, activeFloorNumber: floorNumber }),

    setActiveBuilding: (buildingId) => set({ activeBuildingId: buildingId }),

    setUserAnchor: (nodeId) => set({ userAnchorNodeId: nodeId }),

    selectShop: (shop) => set({ selectedShop: shop }),

    setRoute: (destinationNodeId) =>
      set({ routeDestinationNodeId: destinationNodeId, routeVisible: true }),

    clearRoute: () =>
      set({ routeDestinationNodeId: null, routeVisible: false }),

    setSearch: (query) => set({ searchQuery: query }),

    openSearch: () => set({ searchOpen: true }),

    closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  },
}));

// Selector helpers — use these instead of selecting the whole store
export const useActiveFloorId = () => useMapStore((s) => s.activeFloorId);
export const useSelectedShop = () => useMapStore((s) => s.selectedShop);
export const useRouteVisible = () => useMapStore((s) => s.routeVisible);
export const useMapActions = () => useMapStore((s) => s.actions);
