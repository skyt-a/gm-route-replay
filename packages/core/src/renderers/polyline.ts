interface PolylineRendererOptions {
  map: google.maps.Map;
  polylineOptions?: google.maps.PolylineOptions;
}

export class PolylineRenderer {
  private map: google.maps.Map;
  private basePolylineOptions: google.maps.PolylineOptions;
  private polylines = new Map<string, google.maps.Polyline>();
  private currentPaths = new Map<string, google.maps.LatLngLiteral[]>();

  constructor({ map, polylineOptions }: PolylineRendererOptions) {
    this.map = map;
    this.basePolylineOptions = {
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 4,
      clickable: false,
      ...(polylineOptions || {}),
      path: [],
      map: this.map,
    };
    console.log("PolylineRenderer initialized for multi-track.");
  }

  private getOrCreatePolyline(trackId: string): google.maps.Polyline {
    let polyline = this.polylines.get(trackId);
    if (!polyline) {
      polyline = new google.maps.Polyline({
        ...this.basePolylineOptions,
      });
      this.polylines.set(trackId, polyline);
      this.currentPaths.set(trackId, []);
      console.log(`Polyline created for track ${trackId}`);
    }
    return polyline;
  }

  /**
   * Adds a new point to the end of the polyline for a specific track,
   * only if it's different from the last point.
   * @param trackId - Identifier for the track.
   * @param point - The LatLng literal to add.
   */
  addPoint(trackId: string, point: google.maps.LatLngLiteral): void {
    const polyline = this.getOrCreatePolyline(trackId);
    const path = this.currentPaths.get(trackId) || [];

    const lastPoint = path.length > 0 ? path[path.length - 1] : null;
    if (
      !lastPoint ||
      lastPoint.lat !== point.lat ||
      lastPoint.lng !== point.lng
    ) {
      path.push(point);
      this.currentPaths.set(trackId, path);
      polyline.setPath([...path]);
    } else {
    }
  }

  /**
   * Resets the polyline path to be empty for a specific track.
   * @param trackId - Identifier for the track.
   */
  resetPath(trackId: string): void {
    const polyline = this.polylines.get(trackId);
    if (polyline) {
      polyline.setPath([]);
    }
    this.currentPaths.set(trackId, []);
  }

  /**
   * Gets the current path for a specific track.
   * @param trackId - Identifier for the track.
   * @returns The current path as an array of LatLngLiterals, or an empty array if not found.
   */
  getCurrentPath(trackId: string): google.maps.LatLngLiteral[] {
    return [...(this.currentPaths.get(trackId) || [])];
  }

  /**
   * Resets the polyline paths for all tracks.
   */
  resetAllPaths(): void {
    this.polylines.forEach((polyline) => polyline.setPath([]));
    this.currentPaths.clear();
    console.log("All polyline paths reset.");
  }

  /**
   * Sets the polyline path for a specific track (used for seeking).
   * @param trackId - Identifier for the track.
   * @param path - The path to set.
   */
  setPath(trackId: string, path: google.maps.LatLngLiteral[]): void {
    const polyline = this.getOrCreatePolyline(trackId);
    this.currentPaths.set(trackId, [...path]);
    polyline.setPath([...path]);
  }

  /**
   * Removes the polyline for a specific track from the map.
   * @param trackId - Identifier for the track.
   */
  removePath(trackId: string): void {
    const polyline = this.polylines.get(trackId);
    if (polyline) {
      polyline.setMap(null);
      this.polylines.delete(trackId);
      this.currentPaths.delete(trackId);
      console.log(`Polyline removed for track ${trackId}`);
    }
  }

  /**
   * Removes all polylines managed by this renderer from the map.
   */
  removeAllPaths(): void {
    this.polylines.forEach((polyline, trackId) => {
      polyline.setMap(null);
    });
    this.polylines.clear();
    this.currentPaths.clear();
    console.log("All polylines removed.");
  }

  /**
   * Cleans up all polylines.
   */
  destroy(): void {
    this.removeAllPaths();
    console.log("PolylineRenderer destroyed.");
  }
}
