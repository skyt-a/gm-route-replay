import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Animator } from "./animator";

describe("Animator", () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let frameIdCounter = 0;
  let currentMockTime = 0;

  beforeEach(() => {
    rafCallbacks = [];
    frameIdCounter = 0;
    currentMockTime = 0;
    vi.useFakeTimers();

    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      frameIdCounter++;
      return frameIdCounter;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks = rafCallbacks.filter((_, index, arr) => {
        return id !== frameIdCounter;
      });
    });

    vi.spyOn(performance, "now").mockImplementation(() => currentMockTime);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const runRafCallbacks = (advancedTime: number) => {
    currentMockTime += advancedTime;
    const callbacksToRun = [...rafCallbacks];
    rafCallbacks = [];
    callbacksToRun.forEach((cb) => cb(currentMockTime));
  };

  it("should initialize with default speed if not provided", () => {
    const animator = new Animator({ fps: 60 });
    expect(animator).toBeDefined();
  });

  it("should initialize with custom options", () => {
    const animator = new Animator({ fps: 30, initialSpeed: 2 });
    expect(animator).toBeDefined();
  });

  it("should start animation and call frame callback", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);

    runRafCallbacks(0);

    vi.advanceTimersByTime(16);
    runRafCallbacks(16);

    expect(frameCallback).toHaveBeenCalledTimes(2);
    expect(frameCallback).toHaveBeenNthCalledWith(1, expect.closeTo(0, 0));
    expect(frameCallback).toHaveBeenNthCalledWith(2, expect.closeTo(16, 0));

    vi.advanceTimersByTime(1);
    runRafCallbacks(1);
    expect(frameCallback).toHaveBeenCalledTimes(3);

    expect(frameCallback).toHaveBeenNthCalledWith(3, expect.closeTo(17, 0));

    vi.advanceTimersByTime(100);
    runRafCallbacks(100);

    const finalCallCount = frameCallback.mock.calls.length;
    expect(finalCallCount).toBeGreaterThan(3);

    expect(frameCallback.mock.lastCall?.[0] ?? 0).toBeCloseTo(17 + 100, 0);
  });

  it("should pause animation", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);

    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsBeforePause = frameCallback.mock.calls.length;
    expect(callsBeforePause).toBeGreaterThan(0);

    animator.pause();
    const rafCountAfterPause = rafCallbacks.length;

    vi.advanceTimersByTime(100);
    runRafCallbacks(100);

    expect(frameCallback).toHaveBeenCalledTimes(callsBeforePause);
  });

  it("should resume animation after pause", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);
    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsBeforePause = frameCallback.mock.calls.length;
    const lastTimeBeforePause = frameCallback.mock.lastCall?.[0] ?? 0;

    animator.pause();
    vi.advanceTimersByTime(100);
    runRafCallbacks(100);

    animator.start(frameCallback);
    runRafCallbacks(0);
    const callsAfterResumeImmediate = frameCallback.mock.calls.length;
    expect(callsAfterResumeImmediate).toBeGreaterThan(callsBeforePause);
    expect(frameCallback.mock.lastCall?.[0] ?? 0).toBeCloseTo(
      lastTimeBeforePause ?? 0,
      0
    );

    vi.advanceTimersByTime(50);
    runRafCallbacks(50);

    const callsAfterAdvance = frameCallback.mock.calls.length;
    const lastTimeAfterAdvance = frameCallback.mock.lastCall?.[0] ?? 0;

    expect(callsAfterAdvance).toBeGreaterThan(callsAfterResumeImmediate);

    expect(lastTimeAfterAdvance).toBeCloseTo(
      (lastTimeBeforePause ?? 0) + 50,
      0
    );
  });

  it("should stop animation and reset time", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);
    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsBeforeStop = frameCallback.mock.calls.length;
    expect(animator.getCurrentTimelineTimeMs()).toBeGreaterThan(0);

    animator.stop();
    expect(animator.getCurrentTimelineTimeMs()).toBe(0);

    vi.advanceTimersByTime(100);
    runRafCallbacks(100);
    expect(frameCallback).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it("should change speed", () => {
    const animator = new Animator({ fps: 60, initialSpeed: 1 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);

    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsAtSpeed1 = frameCallback.mock.calls.length;
    const timeAtSpeed1 = frameCallback.mock.lastCall?.[0] ?? 0;
    expect(callsAtSpeed1).toBeGreaterThan(0);
    expect(timeAtSpeed1).toBeCloseTo(50, 0);

    animator.setSpeed(2);

    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsAtSpeed2 = frameCallback.mock.calls.length;
    const timeAtSpeed2 = frameCallback.mock.lastCall?.[0] ?? 0;

    expect(callsAtSpeed2).toBeGreaterThan(callsAtSpeed1);
    expect(timeAtSpeed2).toBeGreaterThan(timeAtSpeed1);

    expect(timeAtSpeed2 - timeAtSpeed1).toBeCloseTo(100, 0);
  });

  it("should set current timeline time", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);
    const initialCallTime = frameCallback.mock.lastCall?.[0] ?? 0;

    animator.setCurrentTimelineTimeMs(500);
    expect(animator.getCurrentTimelineTimeMs()).toBe(500);

    const frameDuration = 1000 / 60;
    vi.advanceTimersByTime(frameDuration);
    runRafCallbacks(frameDuration);

    expect(frameCallback).toHaveBeenCalledTimes(2);

    expect(frameCallback.mock.lastCall?.[0] ?? 0).toBeCloseTo(
      500 + frameDuration,
      0
    );
  });

  it("should cleanup on destroy", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");

    animator.destroy();
    expect(cancelSpy).toHaveBeenCalled();
    expect(animator.getCurrentTimelineTimeMs()).toBe(0);

    const callsBeforeDestroy = frameCallback.mock.calls.length;

    vi.advanceTimersByTime(100);
    runRafCallbacks(100);

    expect(frameCallback).toHaveBeenCalledTimes(callsBeforeDestroy);
  });
});
