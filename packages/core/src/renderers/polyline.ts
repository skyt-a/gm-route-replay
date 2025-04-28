/// <reference types="@types/google.maps" />

interface PolylineRendererOptions {
  map: google.maps.Map;
  polylineOptions?: google.maps.PolylineOptions;
}

export class PolylineRenderer {
  private map: google.maps.Map;
  private polyline: google.maps.Polyline | null = null;
  private options: google.maps.PolylineOptions;
  private currentPath: google.maps.LatLngLiteral[] = []; // Store the currently drawn path

  constructor({ map, polylineOptions }: PolylineRendererOptions) {
    this.map = map;
    this.options = {
      strokeColor: "#FF0000", // Keep red color from example
      strokeOpacity: 0.8,
      strokeWeight: 4,
      clickable: false,
      ...(polylineOptions || {}),
    };

    this.polyline = new google.maps.Polyline({
      ...this.options,
      map: this.map,
      path: [], // Start with empty path
    });
    console.log("PolylineRenderer initialized (dynamic path).");
  }

  /**
   * Adds a new point to the end of the currently drawn polyline.
   * @param point - The LatLng literal to add.
   */
  addPoint(point: google.maps.LatLngLiteral): void {
    if (!this.polyline) return;

    this.currentPath.push(point);
    // Create a new array for setPath, modifying MVCArray in place can be less reliable sometimes
    this.polyline.setPath([...this.currentPath]);
    // console.log(`Polyline point added. Path length: ${this.currentPath.length}`); // Optional log
  }

  /**
   * Resets the polyline path to be empty.
   */
  resetPath(): void {
    this.currentPath = [];
    if (this.polyline) {
      this.polyline.setPath([]);
    }
    // console.log("Polyline path reset."); // Optional log
  }

  /**
   * Sets the polyline path to a specific set of points (used for seeking).
   * @param path - The path to set.
   */
  setPath(path: google.maps.LatLngLiteral[]): void {
    this.currentPath = [...path]; // Update internal state
    if (this.polyline) {
      this.polyline.setPath(this.currentPath);
    }
    // console.log(`Polyline path explicitly set to ${path.length} points.`); // Optional log
  }

  /**
   * Cleans up the polyline from the map.
   */
  destroy(): void {
    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = null;
      console.log("PolylineRenderer destroyed.");
    }
  }
}
