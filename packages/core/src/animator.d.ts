interface AnimatorOptions {
    fps: number;
}
export declare class Animator {
    private fps;
    private interval;
    private animationFrameId;
    private lastFrameTime;
    private isRunning;
    private onFrameCallback;
    private timelineStartTime;
    private accumulatedPauseTime;
    private lastPauseTime;
    constructor(options: AnimatorOptions);
    start(onFrame: (timelineTimeMs: number) => void): void;
    pause(): void;
    stop(): void;
    destroy(): void;
    private loop;
}
export {};
