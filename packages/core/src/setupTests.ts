import { vi, beforeEach, afterEach } from "vitest";
// Import initialize and potentially mockInstances from the new library
import { initialize, mockInstances } from "@soleo/google-maps-vitest-mocks";

// Define minimal mocks for missing global objects
// 削除: vi.stubGlobal と関連するモック定義
/*
const MockPoint = vi.fn((x = 0, y = 0) => ({ x, y }));
const MockSymbolPath = {
  FORWARD_CLOSED_ARROW: "mock_forward_closed_arrow", // Use a simple string
  CIRCLE: "mock_circle",
};
const MockLatLng = vi.fn((lat = 0, lng = 0) => ({
  lat: () => lat,
  lng: () => lng,
}));
const mockComputeHeading = vi.fn(() => 0);

vi.stubGlobal("google", {
  maps: {
    // Let initialize() handle core mocks like Map, Marker, etc.
    Point: MockPoint,
    SymbolPath: MockSymbolPath,
    LatLng: MockLatLng,
    event: {
      addListener: vi.fn(() => ({ remove: vi.fn() })),
      clearInstanceListeners: vi.fn(),
    },
    geometry: {
      spherical: { computeHeading: mockComputeHeading },
    },
    // Add other necessary mocks if tests fail due to missing objects
    // e.g., Data, MVCArray, MVCObject might be needed later
    Data: vi.fn(() => ({
      addListener: vi.fn(),
      setMap: vi.fn(),
      getFeatureById: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      forEach: vi.fn(),
    })),
    MVCArray: vi.fn((arr = []) => ({
      getArray: vi.fn(() => arr),
      getAt: vi.fn((idx) => arr[idx]),
      getLength: vi.fn(() => arr.length),
      push: vi.fn((e) => {
        arr.push(e);
        return arr.length;
      }),
      forEach: vi.fn((cb) => arr.forEach(cb)),
    })),
    MVCObject: vi.fn(() => ({
      addListener: vi.fn(() => ({ remove: vi.fn() })),
      bindTo: vi.fn(),
      get: vi.fn(),
      notify: vi.fn(),
      set: vi.fn(),
      setValues: vi.fn(),
      unbind: vi.fn(),
      unbindAll: vi.fn(),
    })),
  },
});
*/

beforeEach(() => {
  // Initialize the mocks provided by the library
  initialize();

  // Optional: Clear mock instances tracked by the library if needed,
  // though initialize() often handles this.
  // mockInstances.clearAll();
});

afterEach(() => {
  // Optional cleanup, though initialize() might suffice.
  // Restore any other mocks if necessary.
  // If stubGlobal was used previously, unstub them.
  // vi.unstubAllGlobals(); // Not strictly needed if setupTests only uses initialize now.
});
