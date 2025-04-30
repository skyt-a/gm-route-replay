import type { IRenderer } from "./types";

interface WebGLRendererOptions {
  map: google.maps.Map;
}

interface WebGLMarkerData {
  path: google.maps.LatLngAltitudeLiteral[];
  heading?: number;
  color: [number, number, number, number];
  buffer: WebGLBuffer | null;
}

const LINE_VERTEX_SHADER_SOURCE = `
  attribute vec3 a_worldPosition; 
  uniform mat4 u_viewProjectionMatrix; 

  void main() {
    gl_Position = u_viewProjectionMatrix * vec4(a_worldPosition, 1.0);
  }
`;
const LINE_FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_color; 
  void main() { gl_FragColor = u_color; }
`;

const POINT_VERTEX_SHADER_SOURCE = `
  attribute vec4 a_pointPosition;
  uniform mat4 u_mvpMatrix;       // Model * View * Projection Matrix

  void main() {
    gl_Position = u_mvpMatrix * a_pointPosition;
    gl_PointSize = 10.0;
  }
`;
const POINT_FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_pointColor; 
  void main() { gl_FragColor = u_pointColor; }
`;

function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + i] * b[j * 4 + k];
      }
      result[j * 4 + i] = sum;
    }
  }
  return result;
}

function createTranslationMatrix(
  tx: number,
  ty: number,
  tz: number
): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1]);
}

function generateColorForTrackId(
  trackId: string
): [number, number, number, number] {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = trackId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return [r / 255, g / 255, b / 255, 1.0];
}

export class WebGLOverlayRenderer implements IRenderer {
  private map: google.maps.Map;
  private overlayView: google.maps.WebGLOverlayView | null = null;
  private gl: WebGLRenderingContext | null = null;
  private markersData = new Map<string, WebGLMarkerData>();
  private colorMap = new Map<string, [number, number, number, number]>();
  private isMounted = false;

  private lineProgram: WebGLProgram | null = null;
  private worldPositionAttributeLocation: number = -1;
  private viewProjectionMatrixUniformLocation: WebGLUniformLocation | null =
    null;
  private lineColorUniformLocation: WebGLUniformLocation | null = null;

  private pointProgram: WebGLProgram | null = null;
  private pointPositionAttributeLocation: number = -1;
  private pointMvpMatrixUniformLocation: WebGLUniformLocation | null = null;
  private pointColorUniformLocation: WebGLUniformLocation | null = null;
  private pointOriginBuffer: WebGLBuffer | null = null;

  constructor({ map }: WebGLRendererOptions) {
    this.map = map;
    this.overlayView = new google.maps.WebGLOverlayView();
    this.overlayView.onAdd = this.onAdd.bind(this);
    this.overlayView.onContextRestored = this.onContextRestored.bind(this);
    this.overlayView.onDraw = this.onDraw.bind(this);
    this.overlayView.onRemove = this.onRemove.bind(this);
  }

  mount(): void {
    if (!this.isMounted && this.overlayView && this.map) {
      this.overlayView.setMap(this.map);
      this.isMounted = true;
    } else if (this.isMounted) {
      console.warn("WebGLOverlayRenderer already mounted.");
    } else {
      console.error(
        "WebGLOverlayRenderer cannot mount, overlayView or map is null."
      );
    }
  }

  private onAdd(): void {}

  private onContextRestored({ gl }: google.maps.WebGLStateOptions): void {
    this.gl = gl;
    let success = true;

    const lineVertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      LINE_VERTEX_SHADER_SOURCE
    );
    const lineFragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      LINE_FRAGMENT_SHADER_SOURCE
    );
    if (lineVertexShader && lineFragmentShader) {
      this.lineProgram = this.createProgram(
        lineVertexShader,
        lineFragmentShader
      );
      if (this.lineProgram) {
        this.worldPositionAttributeLocation = gl.getAttribLocation(
          this.lineProgram,
          "a_worldPosition"
        );
        this.viewProjectionMatrixUniformLocation = gl.getUniformLocation(
          this.lineProgram,
          "u_viewProjectionMatrix"
        );
        this.lineColorUniformLocation = gl.getUniformLocation(
          this.lineProgram,
          "u_color"
        );
        success =
          success &&
          this.worldPositionAttributeLocation >= 0 &&
          !!this.viewProjectionMatrixUniformLocation &&
          !!this.lineColorUniformLocation;
        if (!success) console.error("Failed to get line shader locations.");
      } else {
        success = false;
        console.error("Failed to create line program.");
      }
    } else {
      success = false;
      console.error("Failed to compile line shaders.");
    }

    const pointVertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      POINT_VERTEX_SHADER_SOURCE
    );
    const pointFragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      POINT_FRAGMENT_SHADER_SOURCE
    );
    if (pointVertexShader && pointFragmentShader) {
      this.pointProgram = this.createProgram(
        pointVertexShader,
        pointFragmentShader
      );
      if (this.pointProgram) {
        this.pointPositionAttributeLocation = gl.getAttribLocation(
          this.pointProgram,
          "a_pointPosition"
        );
        this.pointMvpMatrixUniformLocation = gl.getUniformLocation(
          this.pointProgram,
          "u_mvpMatrix"
        );
        this.pointColorUniformLocation = gl.getUniformLocation(
          this.pointProgram,
          "u_pointColor"
        );
        success =
          success &&
          this.pointPositionAttributeLocation >= 0 &&
          !!this.pointMvpMatrixUniformLocation &&
          !!this.pointColorUniformLocation;
        if (!success) console.error("Failed to get point shader locations.");
      } else {
        success = false;
        console.error("Failed to create point program.");
      }
    } else {
      success = false;
      console.error("Failed to compile point shaders.");
    }

    this.pointOriginBuffer = gl.createBuffer();
    if (!this.pointOriginBuffer) {
      success = false;
      console.error("Failed to create point origin buffer.");
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pointOriginBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 0]),
        gl.STATIC_DRAW
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    if (success) {
      this.requestRedraw();
    } else {
      console.error(
        "WebGL resource creation failed. Renderer might not draw correctly."
      );

      this.cleanupProgramsAndBuffers();
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      console.error("Failed to create shader.");
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) {
      console.error("Failed to create program.");
      return null;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  }

  private onDraw({ gl, transformer }: google.maps.WebGLDrawOptions): void {
    if (
      !this.gl ||
      !this.lineProgram ||
      !this.pointProgram ||
      !this.pointOriginBuffer ||
      this.worldPositionAttributeLocation < 0 ||
      !this.viewProjectionMatrixUniformLocation ||
      !this.lineColorUniformLocation ||
      this.pointPositionAttributeLocation < 0 ||
      !this.pointMvpMatrixUniformLocation ||
      !this.pointColorUniformLocation
    ) {
      console.error("WebGL resources not fully initialized in onDraw.");
      return;
    }

    const viewProjectionMatrix = (transformer as any).Fg as Float32Array;
    if (!viewProjectionMatrix || viewProjectionMatrix.length !== 16) {
      console.error("View projection matrix not found or invalid.");
      return;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.lineProgram);
    gl.uniformMatrix4fv(
      this.viewProjectionMatrixUniformLocation,
      false,
      viewProjectionMatrix
    );
    gl.enableVertexAttribArray(this.worldPositionAttributeLocation);

    this.markersData.forEach((data, trackId) => {
      if (data.path.length < 2) return;

      if (!data.buffer) {
        data.buffer = gl.createBuffer();
        if (!data.buffer) return;
        const worldCoords = new Float32Array(data.path.length * 3);
        data.path.forEach((pos, i) => {
          const worldPos = transformer.fromLatLngAltitude(pos);
          worldCoords[i * 3] = worldPos[0];
          worldCoords[i * 3 + 1] = worldPos[1];
          worldCoords[i * 3 + 2] = worldPos[2];
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, data.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, worldCoords, gl.DYNAMIC_DRAW);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, data.buffer);
      }

      gl.vertexAttribPointer(
        this.worldPositionAttributeLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.uniform4fv(this.lineColorUniformLocation, data.color);

      gl.drawArrays(gl.LINE_STRIP, 0, data.path.length);
    });

    gl.useProgram(this.pointProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointOriginBuffer);
    gl.vertexAttribPointer(
      this.pointPositionAttributeLocation,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(this.pointPositionAttributeLocation);

    this.markersData.forEach((data) => {
      if (data.path.length === 0) return;

      const lastPosition = data.path[data.path.length - 1];
      const worldPos = transformer.fromLatLngAltitude(lastPosition);

      const modelMatrix = createTranslationMatrix(
        worldPos[0],
        worldPos[1],
        worldPos[2]
      );
      const mvpMatrix = multiplyMatrices(viewProjectionMatrix, modelMatrix);

      gl.uniformMatrix4fv(this.pointMvpMatrixUniformLocation, false, mvpMatrix);
      gl.uniform4fv(this.pointColorUniformLocation, data.color);

      gl.drawArrays(gl.POINTS, 0, 1);
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private onRemove(): void {
    this.cleanupProgramsAndBuffers();
    this.gl = null;
  }

  private requestRedraw(): void {
    if (this.overlayView) {
      this.overlayView.requestRedraw();
    }
  }

  private getColorForTrack(trackId: string): [number, number, number, number] {
    if (!this.colorMap.has(trackId)) {
      const newColor = generateColorForTrackId(trackId);
      this.colorMap.set(trackId, newColor);
    }

    return this.colorMap.get(trackId)!;
  }

  updateMarker(
    trackId: string,
    position: google.maps.LatLngLiteral | null,
    heading?: number
  ): void {
    if (position === null) {
      this.removeMarker(trackId);
      return;
    }
    const positionWithAltitude: google.maps.LatLngAltitudeLiteral = {
      ...position,
      altitude: 0,
    };
    const color = this.getColorForTrack(trackId);

    const existingData = this.markersData.get(trackId);
    if (existingData) {
      existingData.path.push(positionWithAltitude);

      if (heading !== undefined) {
        existingData.heading = heading;
      }

      existingData.color = color;

      if (existingData.buffer) {
        this.gl?.deleteBuffer(existingData.buffer);
        existingData.buffer = null;
      }
    } else {
      this.markersData.set(trackId, {
        path: [positionWithAltitude],
        heading: heading,
        color: color,
        buffer: null,
      });
    }

    this.requestRedraw();
  }

  removeMarker(trackId: string): void {
    const data = this.markersData.get(trackId);
    if (data) {
      if (data.buffer && this.gl) {
        this.gl.deleteBuffer(data.buffer);
      }
      this.markersData.delete(trackId);
      this.requestRedraw();
    }
  }

  removeAllMarkers(): void {
    if (this.markersData.size > 0) {
      if (this.gl) {
        this.markersData.forEach((data) => {
          if (data.buffer) {
            this.gl?.deleteBuffer(data.buffer);
          }
        });
      }
      this.markersData.clear();
      this.colorMap.clear();
      this.requestRedraw();
    }
  }

  destroy(): void {
    if (this.overlayView) {
      this.overlayView.setMap(null);
      this.overlayView = null;
    }

    this.cleanupProgramsAndBuffers();
    this.markersData.clear();
    this.colorMap.clear();
    this.isMounted = false;
    this.gl = null;
  }

  private cleanupProgramsAndBuffers(): void {
    if (!this.gl) return;
    const gl = this.gl;

    this.markersData.forEach((data) => {
      if (data.buffer) gl.deleteBuffer(data.buffer);
    });

    if (this.lineProgram) gl.deleteProgram(this.lineProgram);
    if (this.pointProgram) gl.deleteProgram(this.pointProgram);
    if (this.pointOriginBuffer) gl.deleteBuffer(this.pointOriginBuffer);
    this.lineProgram = null;
    this.pointProgram = null;
    this.pointOriginBuffer = null;
  }
}
