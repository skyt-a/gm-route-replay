import type { PlayerOptions } from "../types";

interface MarkerRendererOptions {
  map: google.maps.Map;
  markerOptions?: google.maps.MarkerOptions;
}

export class MarkerRenderer {
  private map: google.maps.Map;
  private marker: google.maps.Marker | null = null;
  private markerOptions?: google.maps.MarkerOptions;

  constructor(options: MarkerRendererOptions) {
    this.map = options.map;
    this.markerOptions = options.markerOptions;
    // Marker is created lazily on first update or when needed
    console.log("MarkerRenderer initialized");
  }

  private initMarker(): void {
    // Ensure marker exists and is on the map
    if (!this.marker) {
      this.marker = new google.maps.Marker({
        map: this.map,
        position: { lat: 0, lng: 0 }, // Initial dummy position
        visible: false, // Initially hidden
        optimized: true, // Generally good for performance
        ...this.markerOptions,
      });
      console.log("Marker created lazily");
    } else if (!this.marker.getMap()) {
      this.marker.setMap(this.map);
    }
  }

  // Called each frame by the animator/player
  public update(
    position: google.maps.LatLngLiteral | null,
    heading?: number
  ): void {
    if (!position) {
      // If position is null, hide the marker
      if (this.marker && this.marker.getVisible()) {
        this.marker.setVisible(false);
      }
      return;
    }

    this.initMarker(); // Ensure marker exists
    if (!this.marker) return; // Should not happen after initMarker

    if (!this.marker.getVisible()) {
      this.marker.setVisible(true);
    }
    this.marker.setPosition(position);

    // TODO: Update heading if marker icon supports rotation
    // Consider performance implications of updating icon frequently
    // if (heading !== undefined && this.marker.getIcon()?.url) {
    //   const icon = this.marker.getIcon() as google.maps.Symbol | google.maps.Icon;
    //   if (typeof icon === 'object' && icon !== null && 'rotation' in icon) {
    //      // Create a new icon object to avoid modifying the shared one
    //      const newIcon = { ...icon, rotation: heading };
    //      this.marker.setIcon(newIcon);
    //   }
    // }
  }

  public destroy(): void {
    if (this.marker) {
      this.marker.setMap(null); // Remove marker from map
      this.marker = null;
    }
    console.log("MarkerRenderer destroyed");
  }
}
