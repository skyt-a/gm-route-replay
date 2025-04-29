import type { IRenderer } from "./types";
import type { PlayerOptions } from "../types";

interface MarkerRendererOptions {
  map: google.maps.Map;
  markerOptions?: google.maps.MarkerOptions;
}

export class MarkerRenderer implements IRenderer {
  private map: google.maps.Map;
  private baseMarkerOptions: google.maps.MarkerOptions;
  private markers = new Map<string, google.maps.Marker>();

  private lastHeadings = new Map<string, number | undefined>();

  constructor({ map, markerOptions }: MarkerRendererOptions) {
    this.map = map;

    this.baseMarkerOptions = {
      clickable: false,
      crossOnDrag: false,
      ...(markerOptions || {}),
      position: { lat: 0, lng: 0 },
      map: null,
    };
    console.log("MarkerRenderer initialized (implements IRenderer).");
  }

  mount(): void {
    this.markers.forEach((marker) => {
      if (!marker.getMap()) {
        marker.setMap(this.map);
      }
    });
    console.log("MarkerRenderer mounted (existing markers set to map).");
  }

  /**
   * Creates a new marker for a track or updates an existing one.
   * If position is null, the marker is hidden.
   * @param trackId - Identifier for the track.
   * @param position - The new LatLng position.
   * @param heading - The new heading (optional).
   */
  updateMarker(
    trackId: string,
    position: google.maps.LatLngLiteral | null,
    heading?: number
  ): void {
    let marker = this.markers.get(trackId);

    if (position === null) {
      if (marker) {
        marker.setMap(null);
        this.markers.delete(trackId);
        this.lastHeadings.delete(trackId);
      }
      return;
    }

    if (!marker) {
      marker = new google.maps.Marker({
        ...this.baseMarkerOptions,

        position: position,
        map: this.map,
      });
      this.markers.set(trackId, marker);
      console.log(`Marker created for track ${trackId}`);
    } else {
      const currentPos = marker.getPosition();
      if (
        !currentPos ||
        currentPos.lat() !== position.lat ||
        currentPos.lng() !== position.lng
      ) {
        marker.setPosition(position);
      }
    }

    const lastHeading = this.lastHeadings.get(trackId);
    if (heading !== undefined && heading !== lastHeading) {
      const icon = marker.getIcon() as google.maps.Symbol | null | undefined;
      if (icon && typeof icon === "object" && "rotation" in icon) {
        marker.setIcon({
          ...icon,
          rotation: heading,
        });
      } else if (
        !icon &&
        this.baseMarkerOptions.icon &&
        typeof this.baseMarkerOptions.icon === "object" &&
        "path" in this.baseMarkerOptions.icon
      ) {
        marker.setIcon({
          ...(this.baseMarkerOptions.icon as google.maps.Symbol),
          rotation: heading,
        });
      }
      this.lastHeadings.set(trackId, heading);
    }

    if (!marker.getMap()) {
      marker.setMap(this.map);
    }
  }

  /**
   * Removes the marker for a specific track.
   * @param trackId - Identifier for the track.
   */
  removeMarker(trackId: string): void {
    const marker = this.markers.get(trackId);
    if (marker) {
      marker.setMap(null);
      this.markers.delete(trackId);
      this.lastHeadings.delete(trackId);
      console.log(`Marker removed for track ${trackId}`);
    }
  }

  /**
   * Removes all markers managed by this renderer.
   */
  removeAllMarkers(): void {
    this.markers.forEach((marker, trackId) => {
      marker.setMap(null);
    });
    this.markers.clear();
    this.lastHeadings.clear();
    console.log("All markers removed.");
  }

  /**
   * Cleans up all markers.
   */
  destroy(): void {
    this.removeAllMarkers();
    console.log("MarkerRenderer destroyed.");
  }
}
