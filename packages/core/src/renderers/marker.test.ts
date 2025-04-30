import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  MockedFunction,
  Mock,
} from "vitest";
import { MarkerRenderer } from "./marker";

import { Map, Marker, mockInstances } from "@soleo/google-maps-vitest-mocks";

const MockPoint = vi.fn((x = 0, y = 0) => ({
  x,
  y,
  equals: vi.fn(
    (other?: google.maps.Point | null) => other?.x === x && other?.y === y
  ),
  toString: vi.fn(() => `(${x}, ${y})`),
}));
const MockSymbolPath = {
  FORWARD_CLOSED_ARROW: 0,
  CIRCLE: 1,
  BACKWARD_CLOSED_ARROW: 2,
  BACKWARD_OPEN_ARROW: 3,
  FORWARD_OPEN_ARROW: 4,
};
const MockLatLng = vi.fn((lat = 0, lng = 0) => ({
  lat: vi.fn(() => lat),
  lng: vi.fn(() => lng),
  equals: vi.fn(
    (other?: google.maps.LatLng | null) =>
      other?.lat() === lat && other?.lng() === lng
  ),
  toJSON: vi.fn(() => ({ lat, lng })),
  toUrlValue: vi.fn(() => `${lat},${lng}`),
}));
const mockComputeHeading = vi.fn(() => 0);

if (typeof window !== "undefined") {
  window.google = {
    maps: {
      // @ts-ignore
      Map: Map,
      Marker: Marker,
      Point: MockPoint as unknown as typeof google.maps.Point,
      SymbolPath: MockSymbolPath as unknown as typeof google.maps.SymbolPath,
      LatLng: MockLatLng as unknown as typeof google.maps.LatLng,
      event: {
        addListener: vi.fn(() => ({ remove: vi.fn() })),
        clearInstanceListeners: vi.fn(),
        trigger: vi.fn(),
        addDomListener: vi.fn(() => ({ remove: vi.fn() })),
        addDomListenerOnce: vi.fn(() => ({ remove: vi.fn() })),
        addListenerOnce: vi.fn(() => ({ remove: vi.fn() })),
        removeListener: vi.fn(),
        bind: vi.fn(),
      } as unknown as typeof google.maps.event,
      // @ts-ignore
      geometry: {
        spherical: {
          computeHeading: mockComputeHeading,
          computeDistanceBetween: vi.fn(() => 0),
          computeLength: vi.fn(() => 0),
          computeArea: vi.fn(() => 0),
          interpolate: vi.fn((from, to, fraction) => from),
          computeOffset: vi.fn((from, distance, heading) => from),
          computeOffsetOrigin: vi.fn((to, distance, heading) => to),
        } as unknown as typeof google.maps.geometry.spherical,
      },

      Data: vi.fn(() => ({
        addListener: vi.fn(),
        setMap: vi.fn(),
        getFeatureById: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
        forEach: vi.fn(),
      })) as unknown as typeof google.maps.Data,
      MVCArray: vi.fn((arr: any[] = []) => ({
        getArray: vi.fn(() => arr),
        getAt: vi.fn((idx: number) => arr[idx]),
        getLength: vi.fn(() => arr.length),
        push: vi.fn((e: any) => {
          arr.push(e);
          return arr.length;
        }),
        forEach: vi.fn((cb: (elem: any, i: number) => void) => arr.forEach(cb)),
        clear: vi.fn(() => {
          arr.length = 0;
        }),
        insertAt: vi.fn((i: number, elem: any) => arr.splice(i, 0, elem)),
        pop: vi.fn(() => arr.pop()),
        removeAt: vi.fn((i: number) => arr.splice(i, 1)[0]),
        setAt: vi.fn((i: number, elem: any) => {
          arr[i] = elem;
        }),
      })) as unknown as typeof google.maps.MVCArray,
      MVCObject: vi.fn(() => ({
        addListener: vi.fn(() => ({ remove: vi.fn() })),
        bindTo: vi.fn(),
        get: vi.fn(),
        notify: vi.fn(),
        set: vi.fn(),
        setValues: vi.fn(),
        unbind: vi.fn(),
        unbindAll: vi.fn(),
      })) as unknown as typeof google.maps.MVCObject,
    },
  };
}

type TestMarkerOptionsFn = (
  id: string | number,
  position: google.maps.LatLngLiteral,
  heading?: number
) => google.maps.MarkerOptions;

vi.mock("../console", () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("MarkerRenderer", () => {
  let mapInstance: google.maps.Map;
  let renderer: MarkerRenderer;
  let defaultMarkerOptions: google.maps.MarkerOptions;

  beforeEach(() => {
    mapInstance = new /*(window as any).google.maps.*/ google.maps.Map(
      document.createElement("div")
    );

    if (typeof google === "undefined" || !google.maps) {
      throw new Error(
        "google.maps is not defined. Check setupTests.ts and mocking library."
      );
    }

    if (!google.maps.Point) {
      console.warn("google.maps.Point not found in beforeEach, re-mocking.");

      google.maps.Point = MockPoint as any;
    }
    if (!google.maps.SymbolPath) {
      console.warn(
        "google.maps.SymbolPath not found in beforeEach, re-mocking."
      );

      google.maps.SymbolPath = MockSymbolPath as any;
    }

    defaultMarkerOptions = {
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 4,
        fillColor: "#ff0000",
        fillOpacity: 1,
        strokeWeight: 1,
        rotation: 0,
        anchor: new google.maps.Point(0, 2.6),
      },
    };

    renderer = new MarkerRenderer({
      map: mapInstance,
      markerOptions: defaultMarkerOptions,
    });
    renderer.mount();
  });

  it("should initialize and store the map instance", () => {
    expect(renderer).toBeDefined();
    const mapMocks = mockInstances.get(Map);
    expect(mapMocks).toHaveLength(1);
    expect(mapMocks[0]).toBe(mapInstance);
  });

  it("should create a new marker when updateMarker is called with a new ID", () => {
    const markerId = "marker1";
    const pos: google.maps.LatLngLiteral = { lat: 10, lng: 20 };
    const heading = 90;

    renderer.updateMarker(markerId, pos, heading);

    const markerMocks = mockInstances.get(Marker);
    expect(markerMocks).toHaveLength(1);
    const markerInstance = markerMocks[0];

    expect(markerInstance.setMap).toHaveBeenCalledWith(mapInstance);

    const expectedIcon = {
      ...(defaultMarkerOptions.icon as google.maps.Symbol | null),
      rotation: heading,
    };

    expect(markerInstance.setIcon).toHaveBeenCalledWith(
      expect.objectContaining(expectedIcon)
    );

    expect((renderer as any).markers.has(markerId)).toBe(true);
    expect((renderer as any).markers.get(markerId)).toBe(markerInstance);
  });

  it("should update an existing marker position and heading", () => {
    const markerId = "marker1";
    renderer.updateMarker(markerId, { lat: 10, lng: 20 }, 90);
    const markerMock = mockInstances.get(Marker)[0];
    const setPositionSpy = markerMock.setPosition;
    const setIconSpy = markerMock.setIcon;

    setPositionSpy.mockClear();
    setIconSpy.mockClear();

    const newPos = { lat: 11, lng: 21 };
    const newHeading = 180;
    renderer.updateMarker(markerId, newPos, newHeading);

    expect(setPositionSpy).toHaveBeenCalledWith(newPos);
    const expectedNewIcon = {
      ...(defaultMarkerOptions.icon as google.maps.Symbol | null),
      rotation: newHeading,
    };
    expect(setIconSpy).toHaveBeenCalledWith(
      expect.objectContaining(expectedNewIcon)
    );
    expect(mockInstances.get(Marker)).toHaveLength(1);
  });

  it("should remove a specific marker", () => {
    renderer.updateMarker("marker1", { lat: 10, lng: 20 }, 90);
    renderer.updateMarker("marker2", { lat: 11, lng: 21 }, 180);
    const markerInstances = mockInstances.get(Marker);
    expect(markerInstances).toHaveLength(2);
    const marker1Mock = (renderer as any).markers.get("marker1");
    const setMapSpy1 = marker1Mock.setMap;
    setMapSpy1.mockClear();

    renderer.removeMarker("marker1");

    expect(setMapSpy1).toHaveBeenCalledWith(null);
    expect((renderer as any).markers.has("marker1")).toBe(false);
    expect((renderer as any).markers.has("marker2")).toBe(true);
  });

  it("should remove all markers", () => {
    renderer.updateMarker("m1", { lat: 1, lng: 1 }, 0);
    renderer.updateMarker("m2", { lat: 2, lng: 2 }, 90);
    const markerInstances = mockInstances.get(Marker);
    expect(markerInstances).toHaveLength(2);
    const setMapSpy1 = markerInstances[0].setMap;
    const setMapSpy2 = markerInstances[1].setMap;
    setMapSpy1.mockClear();
    setMapSpy2.mockClear();

    renderer.removeAllMarkers();

    expect(setMapSpy1).toHaveBeenCalledWith(null);
    expect(setMapSpy2).toHaveBeenCalledWith(null);
    expect((renderer as any).markers.size).toBe(0);
  });

  it("should call removeAllMarkers on destroy", () => {
    renderer.updateMarker("m1", { lat: 1, lng: 1 }, 0);
    const markerInstance = mockInstances.get(Marker)[0];
    const setMapSpy = markerInstance.setMap;
    setMapSpy.mockClear();
    const removeAllSpy = vi.spyOn(renderer, "removeAllMarkers");

    renderer.destroy();

    expect(removeAllSpy).toHaveBeenCalledTimes(1);
    expect(setMapSpy).toHaveBeenCalledWith(null);
  });

  it("should handle markerOptions as a function", () => {
    const dynamicOptionsFn: MockedFunction<TestMarkerOptionsFn> = vi.fn(
      (id, pos, heading) => ({
        title: `Marker ${id} at ${pos.lat},${pos.lng} heading ${heading}`,
        opacity: 0.8,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
        },
      })
    );

    const rendererWithFn = new MarkerRenderer({
      map: mapInstance,
      markerOptions: dynamicOptionsFn as any,
    });
    rendererWithFn.mount();
    rendererWithFn.updateMarker("dynamic1", { lat: 5, lng: 5 }, 45);
    const markerMock = mockInstances.get(Marker)[0];

    expect(dynamicOptionsFn).toHaveBeenCalledWith(
      "dynamic1",
      { lat: 5, lng: 5 },
      45
    );
    expect(markerMock.setIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: 45,
      })
    );

    const setPositionSpy = markerMock.setPosition;
    const setIconSpy = markerMock.setIcon;
    setPositionSpy.mockClear();
    setIconSpy.mockClear();
    dynamicOptionsFn.mockClear();

    rendererWithFn.updateMarker("dynamic1", { lat: 6, lng: 6 }, 135);

    expect(dynamicOptionsFn).toHaveBeenCalledWith(
      "dynamic1",
      { lat: 6, lng: 6 },
      135
    );
    expect(setPositionSpy).toHaveBeenCalledWith({ lat: 6, lng: 6 });
    expect(setIconSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: 135,
      })
    );
  });
});
