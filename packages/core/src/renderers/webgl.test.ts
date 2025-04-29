import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebGLOverlayRenderer } from "./webgl";

const mockWebGLOverlayViewInstance = {
  onAdd: vi.fn(),
  onContextRestored: vi.fn(),
  onDraw: vi.fn(),
  onRemove: vi.fn(),
  setMap: vi.fn(),
  requestRedraw: vi.fn(),
};
const mockWebGLOverlayView = vi.fn(() => mockWebGLOverlayViewInstance);

const mockMapInstance = {};

const mockTransformer = {
  fromLatLngAltitude: vi.fn((pos: google.maps.LatLngAltitudeLiteral) => {
    return [pos.lat * 1000, pos.lng * 1000, pos.altitude || 0];
  }),

  Fg: new Float32Array(16).fill(1),
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
}

const mockLineProgram = { mockProgram: true, type: "line" } as WebGLProgram;
const mockPointProgram = { mockProgram: true, type: "point" } as WebGLProgram;
let programCount = 0;

const mockGlContext: MockGLContext = {
  createShader: vi.fn(() => ({ mockShader: true } as WebGLShader)),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn((shader, pname) => {
    if (pname === 0x8b81) return true;
    return null;
  }),
  getShaderInfoLog: vi.fn(() => "mock shader info log"),
  createProgram: vi.fn(() => {
    programCount++;

    return programCount % 2 !== 0 ? mockLineProgram : mockPointProgram;
  }),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn((program, pname) => {
    if (pname === 0x8b82) return true;
    return null;
  }),
  getProgramInfoLog: vi.fn(() => "mock program info log"),
  createBuffer: vi.fn(
    () => ({ mockBuffer: true, id: `buffer-${Math.random()}` } as WebGLBuffer)
  ),
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

  beforeEach(() => {
    vi.clearAllMocks();
    programCount = 0;

    let bufferIdCounter = 0;
    mockGlContext.createBuffer = vi.fn(
      () =>
        ({ mockBuffer: true, id: `buffer-${bufferIdCounter++}` } as WebGLBuffer)
    );

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
    expect(mockWebGLOverlayViewInstance.onAdd).toBeInstanceOf(Function);
    expect(mockWebGLOverlayViewInstance.onContextRestored).toBeInstanceOf(
      Function
    );
    expect(mockWebGLOverlayViewInstance.onDraw).toBeInstanceOf(Function);
    expect(mockWebGLOverlayViewInstance.onRemove).toBeInstanceOf(Function);
    expect(mockWebGLOverlayViewInstance.setMap).not.toHaveBeenCalled();
  });

  it("mount should call overlayView.setMap", () => {
    renderer.mount();
    expect(mockWebGLOverlayViewInstance.setMap).toHaveBeenCalledTimes(1);
    expect(mockWebGLOverlayViewInstance.setMap).toHaveBeenCalledWith(mapMock);
  });

  it("mount should be idempotent", () => {
    renderer.mount();
    renderer.mount();
    expect(mockWebGLOverlayViewInstance.setMap).toHaveBeenCalledTimes(1);
  });

  it("onContextRestored should compile shaders, link programs, get locations, and create buffers", () => {
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    mockWebGLOverlayViewInstance.onContextRestored(glOptions);

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
      WebGLRenderingContext.ARRAY_BUFFER,
      expect.objectContaining({ mockBuffer: true })
    );
    expect(mockGlContext.bufferData).toHaveBeenCalledWith(
      WebGLRenderingContext.ARRAY_BUFFER,
      expect.any(Float32Array),
      WebGLRenderingContext.STATIC_DRAW
    );

    expect(mockWebGLOverlayViewInstance.requestRedraw).toHaveBeenCalled();
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

    expect(mockWebGLOverlayViewInstance.requestRedraw).toHaveBeenCalledTimes(2);
  });

  it("onDraw should call GL methods for lines and points", () => {
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    mockWebGLOverlayViewInstance.onContextRestored(glOptions);

    const trackId = "track1";
    renderer.updateMarker(trackId, { lat: 1, lng: 1 });
    renderer.updateMarker(trackId, { lat: 2, lng: 2 });
    renderer.updateMarker(trackId, { lat: 3, lng: 3 });

    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };
    mockWebGLOverlayViewInstance.onDraw(drawOptions);

    expect(mockGlContext.useProgram).toHaveBeenCalledWith(
      expect.objectContaining({ mockProgram: true })
    );
    expect(mockGlContext.uniformMatrix4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "vpMatrixLoc" }),
      false,
      mockTransformer.Fg
    );

    expect(mockGlContext.createBuffer).toHaveBeenCalledTimes(1 + 1);
    expect(mockGlContext.bindBuffer).toHaveBeenCalledWith(
      WebGLRenderingContext.ARRAY_BUFFER,
      expect.anything()
    );
    expect(mockGlContext.bufferData).toHaveBeenCalledWith(
      WebGLRenderingContext.ARRAY_BUFFER,
      expect.any(Float32Array),
      WebGLRenderingContext.DYNAMIC_DRAW
    );

    expect(mockGlContext.vertexAttribPointer).toHaveBeenCalledWith(
      1,
      3,
      WebGLRenderingContext.FLOAT,
      false,
      0,
      0
    );
    expect(mockGlContext.uniform4fv).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lineColorLoc" }),
      expect.any(Array)
    );

    expect(mockGlContext.drawArrays).toHaveBeenCalledWith(
      WebGLRenderingContext.LINE_STRIP,
      0,
      3
    );

    expect(mockGlContext.useProgram).toHaveBeenCalledWith(
      expect.objectContaining({ mockProgram: true })
    );
    expect(mockGlContext.bindBuffer).toHaveBeenCalledWith(
      WebGLRenderingContext.ARRAY_BUFFER,
      expect.objectContaining({ mockBuffer: true })
    );
    expect(mockGlContext.vertexAttribPointer).toHaveBeenCalledWith(
      2,
      3,
      WebGLRenderingContext.FLOAT,
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

    expect(mockGlContext.drawArrays).toHaveBeenCalledWith(
      WebGLRenderingContext.POINTS,
      0,
      1
    );
  });

  it("destroy should cleanup GL resources and clear data", () => {
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    const pointOriginBufferMock = { mockBuffer: true, id: "pointOriginBuffer" };
    const createBufferSpy = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpy.mockReturnValueOnce(pointOriginBufferMock);
    mockWebGLOverlayViewInstance.onContextRestored(glOptions);
    createBufferSpy.mockRestore();
    expect((renderer as any).pointOriginBuffer).toBe(pointOriginBufferMock);

    renderer.updateMarker("track1", { lat: 1, lng: 1 });

    const trackBufferMock = { mockBuffer: true, id: "track1Buffer" };
    const createBufferSpy2 = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpy2.mockReturnValueOnce(trackBufferMock);
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };
    mockWebGLOverlayViewInstance.onDraw(drawOptions);
    createBufferSpy2.mockRestore();
    const markerData = (renderer as any).markersData.get("track1");
    expect(markerData.buffer).toBe(trackBufferMock);

    renderer.destroy();

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(trackBufferMock);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(
      pointOriginBufferMock
    );
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(mockGlContext.deleteProgram).toHaveBeenCalledTimes(2);
    expect((renderer as any).markersData.size).toBe(0);
    expect((renderer as any).colorMap.size).toBe(0);
  });

  it("removeMarker should delete data and specific buffer", () => {
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    const createBufferSpyCtx = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpyCtx.mockReturnValueOnce({
      mockBuffer: true,
      id: "pointOrigin",
    });
    mockWebGLOverlayViewInstance.onContextRestored(glOptions);
    createBufferSpyCtx.mockRestore();

    renderer.updateMarker("track1", { lat: 1, lng: 1 });
    const trackBufferMock = { mockBuffer: true, id: "track1Buffer" };
    const createBufferSpyDraw = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpyDraw.mockReturnValueOnce(trackBufferMock);
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };
    mockWebGLOverlayViewInstance.onDraw(drawOptions);
    createBufferSpyDraw.mockRestore();
    expect((renderer as any).markersData.get("track1").buffer).toBe(
      trackBufferMock
    );

    renderer.removeMarker("track1");

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(trackBufferMock);
    expect((renderer as any).markersData.has("track1")).toBe(false);
  });

  it("removeAllMarkers should clear all track data and specific buffers", () => {
    const glOptions = { gl: mockGlContext as unknown as WebGLRenderingContext };
    const createBufferSpyCtx = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpyCtx.mockReturnValueOnce({
      mockBuffer: true,
      id: "pointOrigin",
    });
    mockWebGLOverlayViewInstance.onContextRestored(glOptions);
    createBufferSpyCtx.mockRestore();

    renderer.updateMarker("track1", { lat: 1, lng: 1 });
    renderer.updateMarker("track2", { lat: 2, lng: 2 });
    const track1BufferMock = { mockBuffer: true, id: "track1Buffer" };
    const track2BufferMock = { mockBuffer: true, id: "track2Buffer" };
    const createBufferSpyDraw = vi.spyOn(mockGlContext, "createBuffer");
    createBufferSpyDraw
      .mockReturnValueOnce(track1BufferMock)
      .mockReturnValueOnce(track2BufferMock);
    const drawOptions = {
      gl: mockGlContext as unknown as WebGLRenderingContext,
      transformer: mockTransformer,
    };

    expect((renderer as any).markersData.get("track1").buffer).toBeNull();
    expect((renderer as any).markersData.get("track2").buffer).toBeNull();

    mockWebGLOverlayViewInstance.onDraw(drawOptions);

    expect(createBufferSpyDraw).toHaveBeenCalledTimes(2);
    expect((renderer as any).markersData.get("track1").buffer).toBe(
      track1BufferMock
    );
    expect((renderer as any).markersData.get("track2").buffer).toBe(
      track2BufferMock
    );

    createBufferSpyDraw.mockRestore();

    renderer.removeAllMarkers();

    expect(mockGlContext.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(track1BufferMock);
    expect(mockGlContext.deleteBuffer).toHaveBeenCalledWith(track2BufferMock);
    expect((renderer as any).markersData.size).toBe(0);
    expect((renderer as any).colorMap.size).toBe(0);
  });
});
