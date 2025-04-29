import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebGLOverlayRenderer } from "./webgl";

const mockLatLng = (lat: number, lng: number): google.maps.LatLng => ({
  lat: () => lat,
  lng: () => lng,
  equals: vi.fn(),
  toJSON: vi.fn(() => ({ lat, lng })),
  toUrlValue: vi.fn(() => `${lat},${lng}`),
});

let capturedRendererMethods: {
  onAdd?: (...args: any[]) => void;
  onContextRestored?: (options: google.maps.WebGLStateOptions) => void;
  onDraw?: (options: google.maps.WebGLDrawOptions) => void;
  onRemove?: (...args: any[]) => void;
  setMap: ReturnType<typeof vi.fn>;
  requestRedraw: ReturnType<typeof vi.fn>;
} | null = null;

const mockWebGLOverlayView = vi.fn().mockImplementation(() => {
  capturedRendererMethods = {
    setMap: vi.fn(),
    requestRedraw: vi.fn(),
  };
  return capturedRendererMethods;
});

const mockMapInstance = {};

const mockTransformer = {
  fromLatLngAltitude: vi.fn((pos: google.maps.LatLngAltitudeLiteral) => {
    const coords = [pos.lat * 1000, pos.lng * 1000, pos.altitude || 0];
    return new Float64Array(coords);
  }),
  getCameraParams: vi.fn(() => ({
    center: mockLatLng(0, 0),
    heading: 0,
    tilt: 0,
    zoom: 1,
  })),

  Fg: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
};

const mockPointOriginBuffer = { mockBuffer: true, id: "pointOrigin" };
const mockTrackBufferMap = new Map<string, WebGLBuffer>();

interface MockGLContext {
  createShader: (type: number) => WebGLShader | null;
  shaderSource: (shader: WebGLShader, source: string) => void;
  compileShader: (shader: WebGLShader) => void;
  getShaderParameter: (shader: WebGLShader, pname: number) => any;
  getShaderInfoLog: (shader: WebGLShader) => string | null;
  createProgram: () => WebGLProgram | null;
  attachShader: (program: WebGLProgram, shader: WebGLShader) => void;
  linkProgram: (program: WebGLProgram) => void;
  getProgramParameter: (program: WebGLProgram, pname: number) => any;
  getProgramInfoLog: (program: WebGLProgram) => string | null;
  createBuffer: () => WebGLBuffer | null;
  bindBuffer: (target: number, buffer: WebGLBuffer | null) => void;
  bufferData: (
    target: number,
    data: BufferSource | null,
    usage: number
  ) => void;
  deleteShader: (shader: WebGLShader) => void;
  clearColor: (red: number, green: number, blue: number, alpha: number) => void;
  clear: (mask: number) => void;
  useProgram: (program: WebGLProgram | null) => void;
  enableVertexAttribArray: (index: number) => void;
  uniformMatrix4fv: (
    location: WebGLUniformLocation | null,
    transpose: boolean,
    value: Float32List
  ) => void;
  vertexAttribPointer: (
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ) => void;
  uniform4fv: (
    location: WebGLUniformLocation | null,
    data: Float32List
  ) => void;
  drawArrays: (mode: number, first: number, count: number) => void;
  deleteProgram: (program: WebGLProgram) => void;
  deleteBuffer: (buffer: WebGLBuffer) => void;
  getAttribLocation: (program: WebGLProgram, name: string) => number;
  getUniformLocation: (
    program: WebGLProgram,
    name: string
  ) => WebGLUniformLocation | null;

  readonly COMPILE_STATUS: 0x8b81;
  readonly LINK_STATUS: 0x8b82;
  readonly VERTEX_SHADER: 0x8b31;
  readonly FRAGMENT_SHADER: 0x8b30;
  readonly ARRAY_BUFFER: 0x8892;
  readonly STATIC_DRAW: 0x88e4;
  readonly DYNAMIC_DRAW: 0x88e8;
  readonly FLOAT: 0x1406;
  readonly COLOR_BUFFER_BIT: 0x00004000;
  readonly POINTS: 0x0000;
  readonly LINE_STRIP: 0x0003;
  readonly DELETE_STATUS: 0x8b80;
  readonly VALIDATE_STATUS: 0x8b83;
  readonly SHADER_TYPE: 0x8b4f;
  readonly ATTACHED_SHADERS: 0x8b85;
  readonly ACTIVE_ATTRIBUTES: 0x8b89;
  readonly ACTIVE_UNIFORMS: 0x8b86;
}

const mockLineProgram = { mockProgram: true, type: "line" } as WebGLProgram;
const mockPointProgram = { mockProgram: true, type: "point" } as WebGLProgram;
let programCount = 0;

const mockGlContext: MockGLContext = {
  createShader: vi.fn(() => ({ mockShader: true } as WebGLShader)),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn((shader, pname) => {
    if (pname === 0x8b81) {
      return true;
    }
    if (pname === 0x8b80) {
      return false;
    }
    if (pname === 0x8b4f) {
      return 0x8b31;
    }

    return null;
  }),
  getShaderInfoLog: vi.fn(() => null),
  createProgram: vi.fn(() => {
    programCount++;

    return programCount % 2 !== 0 ? mockLineProgram : mockPointProgram;
  }),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn((program, pname) => {
    if (pname === 0x8b82) {
      return true;
    }
    if (pname === 0x8b80 || pname === 0x8b83) {
      return false;
    }
    if (pname === 0x8b85 || pname === 0x8b89 || pname === 0x8b86) {
      return 0;
    }

    return null;
  }),
  getProgramInfoLog: vi.fn(() => null),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),

  getAttribLocation: vi.fn((program, name) => {
    if (!program) return -1;

    if (program === mockLineProgram) {
      if (name === "a_worldPosition") return 1;
    } else if (program === mockPointProgram) {
      if (name === "a_pointPosition") return 2;
    }

    return -1;
  }),

  getUniformLocation: vi.fn((program, name) => {
    if (!program) return null;

    if (program === mockLineProgram) {
      if (name === "u_viewProjectionMatrix")
        return { id: "vpMatrixLoc" } as WebGLUniformLocation;
      if (name === "u_color")
        return { id: "lineColorLoc" } as WebGLUniformLocation;
    } else if (program === mockPointProgram) {
      if (name === "u_mvpMatrix")
        return { id: "mvpMatrixLoc" } as WebGLUniformLocation;
      if (name === "u_pointColor")
        return { id: "pointColorLoc" } as WebGLUniformLocation;
    }

    return null;
  }),
  deleteBuffer: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  useProgram: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  uniform4fv: vi.fn(),
  drawArrays: vi.fn(),

  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  ARRAY_BUFFER: 0x8892,
  STATIC_DRAW: 0x88e4,
  DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406,
  COLOR_BUFFER_BIT: 0x00004000,
  POINTS: 0x0000,
  LINE_STRIP: 0x0003,
  DELETE_STATUS: 0x8b80,
  VALIDATE_STATUS: 0x8b83,
  SHADER_TYPE: 0x8b4f,
  ATTACHED_SHADERS: 0x8b85,
  ACTIVE_ATTRIBUTES: 0x8b89,
  ACTIVE_UNIFORMS: 0x8b86,
};

if (typeof global !== "undefined" && !(global as any).google) {
  (global as any).google = {
    maps: {
      WebGLOverlayView: mockWebGLOverlayView,
      Map: vi.fn(() => mockMapInstance),
    },
  };
} else if (typeof window !== "undefined" && !(window as any).google) {
  (window as any).google = {
    maps: {
      WebGLOverlayView: mockWebGLOverlayView,
      Map: vi.fn(() => mockMapInstance),
    },
  };
}

describe("WebGLOverlayRenderer", () => {
  let renderer: WebGLOverlayRenderer;
  let mapMock: google.maps.Map;
  let bufferIdCounter: number;

  beforeEach(() => {
    vi.clearAllMocks();
    programCount = 0;
    capturedRendererMethods = null;
    bufferIdCounter = 0;

    mockGlContext.createBuffer = vi.fn(() => {
      const id = `buffer-${bufferIdCounter++}`;

      return { mockBuffer: true, id: id } as WebGLBuffer;
    });

    vi.stubGlobal("google", {
      maps: {
        WebGLOverlayView: mockWebGLOverlayView,
        Map: vi.fn(() => mockMapInstance),
      },
    });

    mapMock = new google.maps.Map(null as any);

    renderer = new WebGLOverlayRenderer({ map: mapMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should initialize WebGLOverlayView and bind lifecycle methods", () => {
    expect(mockWebGLOverlayView).toHaveBeenCalledTimes(1);

    expect(capturedRendererMethods).not.toBeNull();
    expect((renderer as any).overlayView.onAdd).toBeInstanceOf(Function);
    expect((renderer as any).overlayView.onContextRestored).toBeInstanceOf(
      Function
    );
    expect((renderer as any).overlayView.onDraw).toBeInstanceOf(Function);
    expect((renderer as any).overlayView.onRemove).toBeInstanceOf(Function);

    expect(capturedRendererMethods?.setMap).not.toHaveBeenCalled();
  });

  it("mount should call overlayView.setMap", () => {
    renderer.mount();
    expect(capturedRendererMethods?.setMap).toHaveBeenCalledTimes(1);
    expect(capturedRendererMethods?.setMap).toHaveBeenCalledWith(mapMock);
  });

  it("mount should be idempotent", () => {
    renderer.mount();
    renderer.mount();
    expect(capturedRendererMethods?.setMap).toHaveBeenCalledTimes(1);
  });

  it("onContextRestored should compile shaders, link programs, get locations, and create buffers", () => {
    if (!capturedRendererMethods?.onContextRestored) {
      throw new Error("onContextRestored method not captured");
    }
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };

    capturedRendererMethods.onContextRestored(glOptions);

    expect(mockGlContext.createShader).toHaveBeenCalledTimes(4);
    expect(mockGlContext.compileShader).toHaveBeenCalledTimes(4);
    expect(mockGlContext.createProgram).toHaveBeenCalledTimes(2);
    expect(mockGlContext.linkProgram).toHaveBeenCalledTimes(2);

    expect(mockGlContext.getAttribLocation).toHaveBeenCalledWith(
      expect.anything(),
      "a_worldPosition"
    );
    expect(mockGlContext.getUniformLocation).toHaveBeenCalledWith(
      expect.anything(),
      "u_viewProjectionMatrix"
    );
    expect(mockGlContext.getUniformLocation).toHaveBeenCalledWith(
      expect.anything(),
      "u_color"
    );
    expect(mockGlContext.getAttribLocation).toHaveBeenCalledWith(
      expect.anything(),
      "a_pointPosition"
    );
    expect(mockGlContext.getUniformLocation).toHaveBeenCalledWith(
      expect.anything(),
      "u_mvpMatrix"
    );
    expect(mockGlContext.getUniformLocation).toHaveBeenCalledWith(
      expect.anything(),
      "u_pointColor"
    );

    expect(mockGlContext.createBuffer).toHaveBeenCalledTimes(1);
    expect(mockGlContext.bindBuffer).toHaveBeenCalledWith(
      0x8892,
      expect.objectContaining({ mockBuffer: true })
    );
    expect(mockGlContext.bufferData).toHaveBeenCalledWith(
      0x8892,
      expect.any(Float32Array),
      0x88e4
    );

    expect(capturedRendererMethods.requestRedraw).toHaveBeenCalled();
  });

  it("updateMarker should add new data with path and color, and clear buffer", () => {
    const trackId = "track1";
    const pos1 = { lat: 1, lng: 1 };
    const pos2 = { lat: 2, lng: 2 };

    renderer.updateMarker(trackId, pos1, 90);
    let markerData = (renderer as any).markersData.get(trackId);

    expect(markerData).toBeDefined();
    expect(markerData.path).toEqual([{ ...pos1, altitude: 0 }]);
    expect(markerData.heading).toBe(90);
    expect(markerData.color).toBeDefined();
    expect(markerData.buffer).toBeNull();

    renderer.updateMarker(trackId, pos2, 180);
    markerData = (renderer as any).markersData.get(trackId);

    expect(markerData.path).toEqual([
      { ...pos1, altitude: 0 },
      { ...pos2, altitude: 0 },
    ]);
    expect(markerData.heading).toBe(180);
    expect(markerData.buffer).toBeNull();

    expect(capturedRendererMethods?.requestRedraw).toHaveBeenCalledTimes(2);
  });

  it("onDraw should call GL methods for lines and points", () => {
    if (!capturedRendererMethods?.onContextRestored) {
      throw new Error("onContextRestored method not captured for setup");
    }
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    capturedRendererMethods.onContextRestored(glOptions);

    const trackId = "track1";
    renderer.updateMarker(trackId, { lat: 1, lng: 1 });
    renderer.updateMarker(trackId, { lat: 2, lng: 2 });
    renderer.updateMarker(trackId, { lat: 3, lng: 3 });

    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };

    if (!capturedRendererMethods?.onDraw) {
      throw new Error("onDraw method not captured for setup");
    }
    capturedRendererMethods.onDraw(drawOptions);

    expect(mockGlContext.useProgram).toHaveBeenCalledWith(mockLineProgram);

    const expectedMatrix = expect.any(Float32Array);
    expect(mockGlContext.uniformMatrix4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "vpMatrixLoc" }),
      false,
      expectedMatrix
    );

    expect(mockGlContext.createBuffer).toHaveBeenCalledTimes(1 + 1);
    expect(mockGlContext.bindBuffer).toHaveBeenCalledWith(
      0x8892,
      expect.anything()
    );
    expect(mockGlContext.bufferData).toHaveBeenCalledWith(
      0x8892,
      expect.any(Float32Array),
      0x88e8
    );

    expect(mockGlContext.vertexAttribPointer).toHaveBeenCalledWith(
      1,
      3,
      0x1406,
      false,
      0,
      0
    );
    expect(mockGlContext.uniform4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lineColorLoc" }),
      expect.any(Array)
    );

    expect(mockGlContext.drawArrays).toHaveBeenCalledWith(0x0003, 0, 3);

    expect(mockGlContext.useProgram).toHaveBeenCalledWith(mockPointProgram);
    expect(mockGlContext.bindBuffer).toHaveBeenCalledWith(
      0x8892,
      expect.objectContaining({ mockBuffer: true, id: "buffer-0" })
    );
    expect(mockGlContext.vertexAttribPointer).toHaveBeenCalledWith(
      2,
      3,
      0x1406,
      false,
      0,
      0
    );

    expect(mockTransformer.fromLatLngAltitude).toHaveBeenCalledWith({
      lat: 3,
      lng: 3,
      altitude: 0,
    });

    expect(mockGlContext.uniformMatrix4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mvpMatrixLoc" }),
      false,
      expect.any(Float32Array)
    );
    expect(mockGlContext.uniform4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pointColorLoc" }),
      expect.any(Array)
    );

    expect(mockGlContext.drawArrays).toHaveBeenCalledWith(0x0000, 0, 1);
  });

  it("destroy should cleanup GL resources and clear data", () => {
    if (!capturedRendererMethods?.onContextRestored) {
      throw new Error("onContextRestored method not captured for setup");
    }
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    capturedRendererMethods.onContextRestored(glOptions);
    const expectedPointOriginBuffer = { mockBuffer: true, id: "buffer-0" };
    expect((renderer as any).pointOriginBuffer).toEqual(
      expectedPointOriginBuffer
    );

    renderer.updateMarker("track1", { lat: 1, lng: 1 });

    renderer.updateMarker("track1", { lat: 1.1, lng: 1.1 });

    if (!capturedRendererMethods?.onDraw) {
      throw new Error("onDraw method not captured for setup");
    }
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };
    capturedRendererMethods.onDraw(drawOptions);
    const expectedTrackBuffer = { mockBuffer: true, id: "buffer-1" };
    const markerData = (renderer as any).markersData.get("track1");
    expect(markerData.buffer).toEqual(expectedTrackBuffer);

    renderer.destroy();

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      expectedPointOriginBuffer
    );
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      expectedTrackBuffer
    );
    expect(mockGlContext.deleteProgram).toHaveBeenCalledTimes(2);
    expect((renderer as any).markersData.size).toBe(0);
    expect((renderer as any).colorMap.size).toBe(0);
  });

  it("removeMarker should delete data and specific buffer", () => {
    if (!capturedRendererMethods?.onContextRestored) {
      throw new Error("onContextRestored method not captured for setup");
    }
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    capturedRendererMethods.onContextRestored(glOptions);
    const expectedPointOriginBuffer = { mockBuffer: true, id: "buffer-0" };
    expect((renderer as any).pointOriginBuffer).toEqual(
      expectedPointOriginBuffer
    );

    renderer.updateMarker("track1", { lat: 1, lng: 1 });

    renderer.updateMarker("track1", { lat: 1.1, lng: 1.1 });

    if (!capturedRendererMethods?.onDraw) {
      throw new Error("onDraw method not captured for setup");
    }
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };
    capturedRendererMethods.onDraw(drawOptions);
    const expectedTrackBuffer = { mockBuffer: true, id: "buffer-1" };
    const markerData = (renderer as any).markersData.get("track1");
    expect(markerData.buffer).toEqual(expectedTrackBuffer);

    renderer.removeMarker("track1");

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      expectedTrackBuffer
    );
    expect((renderer as any).markersData.has("track1")).toBe(false);
  });

  it("removeAllMarkers should clear all track data and specific buffers", () => {
    if (!capturedRendererMethods?.onContextRestored) {
      throw new Error("onContextRestored method not captured for setup");
    }
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    capturedRendererMethods.onContextRestored(glOptions);

    renderer.updateMarker("track1", { lat: 1, lng: 1 });

    renderer.updateMarker("track1", { lat: 1.1, lng: 1.1 });

    renderer.updateMarker("track2", { lat: 2, lng: 2 });

    renderer.updateMarker("track1", { lat: 1.1, lng: 1.1 });
    renderer.updateMarker("track2", { lat: 2.1, lng: 2.1 });

    const expectedTrack1BufferId = "buffer-1";
    const expectedTrack2BufferId = "buffer-2";

    if (!capturedRendererMethods?.onDraw) {
      throw new Error("onDraw method not captured for setup");
    }
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };

    expect((renderer as any).markersData.get("track1").buffer).toBeNull();
    expect((renderer as any).markersData.get("track2").buffer).toBeNull();

    capturedRendererMethods.onDraw(drawOptions);

    expect(mockGlContext.createBuffer).toHaveBeenCalledTimes(1 + 2);
    const expectedTrack1Buffer = {
      mockBuffer: true,
      id: expectedTrack1BufferId,
    };
    const expectedTrack2Buffer = {
      mockBuffer: true,
      id: expectedTrack2BufferId,
    };

    expect((renderer as any).markersData.get("track1").buffer).toEqual(
      expectedTrack1Buffer
    );
    expect((renderer as any).markersData.get("track2").buffer).toEqual(
      expectedTrack2Buffer
    );

    renderer.removeAllMarkers();

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      expectedTrack1Buffer
    );
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      expectedTrack2Buffer
    );
    expect((renderer as any).markersData.size).toBe(0);
    expect((renderer as any).colorMap.size).toBe(0);
  });
});
