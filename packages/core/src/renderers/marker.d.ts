interface MarkerRendererOptions {
    map: google.maps.Map;
    markerOptions?: google.maps.MarkerOptions;
}
export declare class MarkerRenderer {
    private map;
    private marker;
    private markerOptions?;
    constructor(options: MarkerRendererOptions);
    private initMarker;
    update(position: google.maps.LatLngLiteral | null, heading?: number): void;
    destroy(): void;
}
export {};
