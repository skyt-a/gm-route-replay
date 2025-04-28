interface AnimatorOptions {
  fps: number;
  initialSpeed?: number;
}

export class Animator {
  private fps: number;
  private interval: number;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private isRunning: boolean = false;
  private onFrameCallback: ((timelineTimeMs: number) => void) | null = null;
  private lastPauseTime: number | null = null;

  private currentTimelineTimeMs: number = 0;
  private speedMultiplier: number = 1;

  constructor(options: AnimatorOptions) {
    this.fps = options.fps;
    this.interval = 1000 / this.fps;
    this.speedMultiplier = options.initialSpeed ?? 1;
    if (this.speedMultiplier <= 0) {
      console.warn("Animator speed must be positive. Setting to 1.");
      this.speedMultiplier = 1;
    }
  }

  public setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      console.warn("Animator speed must be positive. Ignoring setSpeed call.");
      return;
    }
    if (this.speedMultiplier !== multiplier) {
      this.speedMultiplier = multiplier;
      console.log(`Animator speed set to ${multiplier}x`);
      if (this.isRunning) {
        this.lastFrameTime = performance.now();
      }
    }
  }

  public getCurrentTimelineTimeMs(): number {
    return this.currentTimelineTimeMs;
  }

  public setCurrentTimelineTimeMs(ms: number): void {
    this.currentTimelineTimeMs = Math.max(0, ms);
    if (this.isRunning) {
      this.lastFrameTime = performance.now();
    }
  }

  public start(onFrame: (timelineTimeMs: number) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onFrameCallback = onFrame;

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
    console.log(`Animator started at time ${this.currentTimelineTimeMs}ms`);
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log(`Animator paused at time ${this.currentTimelineTimeMs}ms`);
  }

  public stop(): void {
    this.pause();
    this.currentTimelineTimeMs = 0;
    this.onFrameCallback = null;
    console.log("Animator stopped (timeline reset)");
  }

  public destroy(): void {
    this.stop();
    console.log("Animator destroyed");
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const realDeltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    const timelineDeltaTime = realDeltaTime * this.speedMultiplier;
    this.currentTimelineTimeMs += timelineDeltaTime;

    if (this.onFrameCallback) {
      this.onFrameCallback(this.currentTimelineTimeMs);
    }
  };
}
