/// <reference types="@types/google.maps" />

import type { PlayerOptions } from "../types";

interface MarkerRendererOptions {
  map: google.maps.Map;
  markerOptions?: google.maps.MarkerOptions; // Base options for all markers
}

export class MarkerRenderer {
  private map: google.maps.Map;
  private baseMarkerOptions: google.maps.MarkerOptions;
  private markers = new Map<string, google.maps.Marker>();
  // Store last known headings for smooth updates when position doesn't change
  private lastHeadings = new Map<string, number | undefined>();

  constructor({ map, markerOptions }: MarkerRendererOptions) {
    this.map = map;
    // Default options, easily customizable
    this.baseMarkerOptions = {
      clickable: false,
      crossOnDrag: false,
      ...(markerOptions || {}),
      position: { lat: 0, lng: 0 }, // Initial position, will be updated
      map: null, // Don't add to map initially
    };
    console.log("MarkerRenderer initialized for multi-track.");
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
      // Hide or remove marker if position is null
      if (marker) {
        marker.setMap(null);
        this.markers.delete(trackId);
        this.lastHeadings.delete(trackId);
        // console.log(`Marker removed for track ${trackId}`);
      }
      return;
    }

    if (!marker) {
      // Create marker if it doesn't exist
      marker = new google.maps.Marker({
        ...this.baseMarkerOptions,
        // Consider allowing per-track options overrides here later
        position: position,
        map: this.map, // Add to map on creation
      });
      this.markers.set(trackId, marker);
      console.log(`Marker created for track ${trackId}`);
    } else {
      // Update existing marker position only if it changed
      const currentPos = marker.getPosition();
      if (
        !currentPos ||
        currentPos.lat() !== position.lat ||
        currentPos.lng() !== position.lng
      ) {
        marker.setPosition(position);
      }
    }

    // Update icon rotation (heading) if provided and different
    const lastHeading = this.lastHeadings.get(trackId);
    if (heading !== undefined && heading !== lastHeading) {
      // Assuming the marker icon has a rotation property
      // Standard markers don't rotate; requires Symbol icon
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
        // If no icon set, but base options has a Symbol, apply rotation to it
        marker.setIcon({
          ...(this.baseMarkerOptions.icon as google.maps.Symbol),
          rotation: heading,
        });
      }
      this.lastHeadings.set(trackId, heading);
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
      // console.log(`Removing marker for track ${trackId}`);
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
