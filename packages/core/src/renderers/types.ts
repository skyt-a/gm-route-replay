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

  removeMarker(trackId: string): void;

  removeAllMarkers(): void;

  mount(): void;

  destroy(): void;
}
