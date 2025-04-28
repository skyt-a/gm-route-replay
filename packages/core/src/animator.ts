interface AnimatorOptions {
  fps: number;
}

export class Animator {
  private fps: number;
  private interval: number;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private isRunning: boolean = false;
  private onFrameCallback: ((timelineTimeMs: number) => void) | null = null; // Updated callback signature
  private timelineStartTime: number = 0; // performance.now() when play() was called
  private accumulatedPauseTime: number = 0;
  private lastPauseTime: number | null = null;

  constructor(options: AnimatorOptions) {
    this.fps = options.fps;
    this.interval = 1000 / this.fps;
  }

  // Callback receives the *timeline* time in ms since playback started (excluding pauses)
  public start(onFrame: (timelineTimeMs: number) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onFrameCallback = onFrame;

    const now = performance.now();
    if (this.lastPauseTime !== null) {
      this.accumulatedPauseTime += now - this.lastPauseTime;
      this.lastPauseTime = null;
    } else {
      // This is a fresh start or restart after stop()
      this.timelineStartTime = now;
      this.accumulatedPauseTime = 0;
    }

    this.lastFrameTime = now;
    this.animationFrameId = requestAnimationFrame(this.loop);
    console.log("Animator started");
  }

  public pause(): void {
    // Renamed from stop() to be clearer
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastPauseTime = performance.now();
    // Do not reset onFrameCallback on pause
    console.log("Animator paused");
  }

  // Reset timeline completely
  public stop(): void {
    this.pause(); // First pause to stop animation frame
    this.onFrameCallback = null;
    this.timelineStartTime = 0;
    this.accumulatedPauseTime = 0;
    this.lastPauseTime = null;
    console.log("Animator stopped (timeline reset)");
  }

  public destroy(): void {
    this.stop();
    console.log("Animator destroyed");
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastFrameTime;

    // Ensure we run close to the target FPS, but requestAnimationFrame is the primary driver
    if (deltaTime >= this.interval * 0.9) {
      // Allow slight variations
      this.lastFrameTime = currentTime; // Don't adjust for overshoot with RAF

      if (this.onFrameCallback) {
        // Calculate timeline time: current time minus start time minus total paused time
        const timelineTimeMs =
          currentTime - this.timelineStartTime - this.accumulatedPauseTime;
        this.onFrameCallback(timelineTimeMs);
      }
    }
  };
}
