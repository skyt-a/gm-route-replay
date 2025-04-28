/// <reference types="@types/google.maps" />

/** Common interface for different rendering strategies. */
export interface IRenderer {
  /**
   * Updates or creates a marker for a specific track.
   * @param trackId Identifier for the track.
   * @param position New position, or null to remove/hide.
   * @param heading Optional heading.
   */
  updateMarker(
    trackId: string,
    position: google.maps.LatLngLiteral | null,
    heading?: number
  ): void;

  /** Removes the marker for a specific track. */
  removeMarker(trackId: string): void;

  /** Removes all markers. */
  removeAllMarkers(): void;

  /** Mounts the renderer to the map (e.g., calls setMap). */
  mount(): void;

  /** Cleans up resources used by the renderer. */
  destroy(): void;
}
