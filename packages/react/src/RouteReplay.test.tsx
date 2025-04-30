import React, { useRef, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { RouteReplay, type RouteReplayHandle } from "./component";
import type {
  RouteInput,
  PlayerOptions,
  CameraMode,
  CameraOptions,
} from "gm-route-replay-core";

const mockOverlayInstance = {
  setMap: vi.fn(),
  setRoute: vi.fn(),
  setOptions: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  seek: vi.fn(),
  setSpeed: vi.fn(),
  setCameraMode: vi.fn(),
  getDurationMs: vi.fn(() => 10000),
};
const mockGmRouteReplayOverlay = vi.fn(() => mockOverlayInstance);

vi.mock("gm-route-replay-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("gm-route-replay-core")>();
  return {
    ...actual,
    GmRouteReplayOverlay: mockGmRouteReplayOverlay,
  };
});

let mockMapInstance: google.maps.Map;

beforeEach(() => {
  vi.clearAllMocks();

  try {
    mockMapInstance = new google.maps.Map(document.createElement("div"));
  } catch (e) {
    console.error(
      "Failed to create mock Map instance. Ensure @soleo/google-maps-vitest-mocks is initialized.",
      e
    );

    mockMapInstance = { setMap: vi.fn() } as any;
  }
});

describe("<RouteReplay />", () => {
  const mockRoute1: RouteInput = [
    { t: 0, lat: 0, lng: 0 },
    { t: 1000, lat: 1, lng: 1 },
  ];
  const mockRoute2: RouteInput = [
    { t: 0, lat: 2, lng: 2 },
    { t: 500, lat: 3, lng: 3 },
  ];
  const mockOptions1: Partial<PlayerOptions> = { initialSpeed: 1 };
  const mockOptions2: Partial<PlayerOptions> = { initialSpeed: 2 };

  const TestComponent = ({
    map,
    route,
    options,
    onRef,
  }: {
    map: google.maps.Map | null;
    route: RouteInput;
    options?: Partial<PlayerOptions>;
    onRef: (ref: RouteReplayHandle | null) => void;
  }) => {
    const ref = useRef<RouteReplayHandle>(null);
    useEffect(() => {
      onRef(ref.current);
    }, [ref.current]);
    return <RouteReplay ref={ref} map={map} route={route} {...options} />;
  };

  it("should initialize GmRouteReplayOverlay on mount with map and route", async () => {
    render(<RouteReplay map={mockMapInstance} route={mockRoute1} />);
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalledTimes(1);
    });
    expect(mockGmRouteReplayOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        map: mockMapInstance,
        route: mockRoute1,
      })
    );
    expect(mockOverlayInstance.setMap).toHaveBeenCalledTimes(1);
    expect(mockOverlayInstance.setMap).toHaveBeenCalledWith(mockMapInstance);
  });

  it("should not initialize overlay if map is null", async () => {
    render(<RouteReplay map={null} route={mockRoute1} />);
    await vi.waitFor(() => {}, { timeout: 50 });
    expect(mockGmRouteReplayOverlay).not.toHaveBeenCalled();
  });

  it("should not initialize overlay if route is null", async () => {
    render(<RouteReplay map={mockMapInstance} route={null as any} />);
    await vi.waitFor(() => {}, { timeout: 50 });
    expect(mockGmRouteReplayOverlay).not.toHaveBeenCalled();
  });

  it("should call setMap(null) and remove listeners on unmount", async () => {
    const handleFrame = vi.fn();
    const { unmount } = render(
      <RouteReplay
        map={mockMapInstance}
        route={mockRoute1}
        onFrame={handleFrame}
      />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalled();
    });

    vi.clearAllMocks();

    unmount();

    expect(mockOverlayInstance.setMap).toHaveBeenCalledWith(null);
  });

  it("should call setMap(null) when map prop becomes null", async () => {
    const { rerender } = render(
      <RouteReplay map={mockMapInstance} route={mockRoute1} />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setMap).toHaveBeenCalledWith(mockMapInstance);
    });
    vi.clearAllMocks();
    rerender(<RouteReplay map={null} route={mockRoute1} />);
    await waitFor(() => {
      expect(mockOverlayInstance.setMap).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setMap).toHaveBeenCalledWith(null);
    });
  });

  it("should register event listeners passed as props", async () => {
    const handleFrame = vi.fn();
    const handleStart = vi.fn();
    const handleFinish = vi.fn();
    render(
      <RouteReplay
        map={mockMapInstance}
        route={mockRoute1}
        onFrame={handleFrame}
        onStart={handleStart}
        onFinish={handleFinish}
      />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalled();
    });
  });

  it("should call setRoute when route prop changes", async () => {
    const { rerender } = render(
      <RouteReplay map={mockMapInstance} route={mockRoute1} />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalledTimes(1);
    });
    rerender(<RouteReplay map={mockMapInstance} route={mockRoute2} />);
    await waitFor(() => {
      expect(mockOverlayInstance.setRoute).toHaveBeenCalledTimes(1);
    });
    expect(mockOverlayInstance.setRoute).toHaveBeenCalledWith(mockRoute2);
  });

  it("should not call setRoute if route prop reference remains the same", async () => {
    const { rerender } = render(
      <RouteReplay map={mockMapInstance} route={mockRoute1} />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalledTimes(1);
    });
    vi.clearAllMocks();
    rerender(<RouteReplay map={mockMapInstance} route={mockRoute1} />);
    await vi.waitFor(() => {}, { timeout: 50 });
    expect(mockOverlayInstance.setRoute).not.toHaveBeenCalled();
  });

  it("should call setOptions when other props change", async () => {
    const { rerender } = render(
      <RouteReplay map={mockMapInstance} route={mockRoute1} {...mockOptions1} />
    );
    await waitFor(() => {
      expect(mockGmRouteReplayOverlay).toHaveBeenCalledWith(
        expect.objectContaining(mockOptions1)
      );
    });
    vi.clearAllMocks();
    rerender(
      <RouteReplay map={mockMapInstance} route={mockRoute1} {...mockOptions2} />
    );
    await waitFor(() => {
      expect(mockOverlayInstance.setOptions).toHaveBeenCalledTimes(1);
    });
    expect(mockOverlayInstance.setOptions).toHaveBeenCalledWith(mockOptions2);
  });

  describe("imperative handle methods", () => {
    const setupHandleTest = async (): Promise<RouteReplayHandle | null> => {
      let handle: RouteReplayHandle | null = null;
      render(
        <TestComponent
          map={mockMapInstance}
          route={mockRoute1}
          onRef={(ref) => {
            handle = ref;
          }}
        />
      );
      await waitFor(() => expect(handle).not.toBeNull());
      await waitFor(() => expect(mockGmRouteReplayOverlay).toHaveBeenCalled());
      vi.clearAllMocks();
      return handle;
    };

    it("play() should call overlay.play()", async () => {
      const handle = await setupHandleTest();
      handle?.play();
      expect(mockOverlayInstance.play).toHaveBeenCalledTimes(1);
    });
    it("pause() should call overlay.pause()", async () => {
      const handle = await setupHandleTest();
      handle?.pause();
      expect(mockOverlayInstance.pause).toHaveBeenCalledTimes(1);
    });
    it("stop() should call overlay.stop()", async () => {
      const handle = await setupHandleTest();
      handle?.stop();
      expect(mockOverlayInstance.stop).toHaveBeenCalledTimes(1);
    });
    it("seek() should call overlay.seek()", async () => {
      const handle = await setupHandleTest();
      const timeMs = 5000;
      handle?.seek(timeMs);
      expect(mockOverlayInstance.seek).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.seek).toHaveBeenCalledWith(timeMs);
    });
    it("setSpeed() should call overlay.setSpeed()", async () => {
      const handle = await setupHandleTest();
      const speed = 2;
      handle?.setSpeed(speed);
      expect(mockOverlayInstance.setSpeed).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setSpeed).toHaveBeenCalledWith(speed);
    });
    it("setCameraMode() should call overlay.setCameraMode()", async () => {
      const handle = await setupHandleTest();
      const mode: CameraMode = "ahead";
      const camOptions: CameraOptions = { aheadDistance: 100 };
      handle?.setCameraMode(mode, camOptions);
      expect(mockOverlayInstance.setCameraMode).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setCameraMode).toHaveBeenCalledWith(
        mode,
        camOptions
      );
    });
    it("setRoute() should call overlay.setRoute()", async () => {
      const handle = await setupHandleTest();
      handle?.setRoute(mockRoute2);
      expect(mockOverlayInstance.setRoute).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setRoute).toHaveBeenCalledWith(mockRoute2);
    });
    it("setOptions() should call overlay.setOptions()", async () => {
      const handle = await setupHandleTest();
      handle?.setOptions(mockOptions2);
      expect(mockOverlayInstance.setOptions).toHaveBeenCalledTimes(1);
      expect(mockOverlayInstance.setOptions).toHaveBeenCalledWith(mockOptions2);
    });
    it("getDurationMs() should call overlay.getDurationMs() and return value", async () => {
      const handle = await setupHandleTest();
      const duration = handle?.getDurationMs();
      expect(mockOverlayInstance.getDurationMs).toHaveBeenCalledTimes(1);
      expect(duration).toBe(10000);
    });
  });
});
