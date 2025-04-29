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

    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      frameIdCounter++;
      return frameIdCounter;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
      // A simple mock: just assumes the last added callback is the one cancelled
      // A more robust mock might track IDs properly
      rafCallbacks = rafCallbacks.filter((_, index, arr) => {
        // This logic might need refinement if multiple raf are active and cancelled selectively
        // For these tests, assuming the last one corresponds to the id might suffice
        return id !== frameIdCounter; // Simplistic id check
      });
    });
    // Mock performance.now to align with fake timers
    vi.spyOn(performance, "now").mockImplementation(() => currentMockTime);
  });

  afterEach(() => {
    vi.restoreAllMocks(); // This restores RAF and performance.now mocks too
    vi.useRealTimers();
  });

  // Helper to simulate RAF execution aligned with timer advancement
  const runRafCallbacks = (advancedTime: number) => {
    currentMockTime += advancedTime;
    const callbacksToRun = [...rafCallbacks];
    rafCallbacks = []; // RAF callbacks usually run once
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

    // Run initial RAF call queued by start()
    runRafCallbacks(0);

    // Advance time slightly less than one frame interval (e.g., 16ms)
    vi.advanceTimersByTime(16);
    runRafCallbacks(16);
    // Callback should have been called twice by now (initial RAF + first advance)
    expect(frameCallback).toHaveBeenCalledTimes(2);
    expect(frameCallback).toHaveBeenNthCalledWith(1, expect.closeTo(0, 0)); // First call is immediate
    expect(frameCallback).toHaveBeenNthCalledWith(2, expect.closeTo(16, 0)); // Second after 16ms

    // Advance time past one frame interval (approx 1000/60 = 16.67ms)
    vi.advanceTimersByTime(1);
    runRafCallbacks(1);
    expect(frameCallback).toHaveBeenCalledTimes(3); // Third call
    // Third call time check (accumulated time)
    expect(frameCallback).toHaveBeenNthCalledWith(3, expect.closeTo(17, 0)); // 16+1

    // Advance more time
    vi.advanceTimersByTime(100);
    runRafCallbacks(100);
    // Check if it was called more times
    const finalCallCount = frameCallback.mock.calls.length;
    expect(finalCallCount).toBeGreaterThan(3);
    // Check last call time
    expect(frameCallback.mock.lastCall?.[0] ?? 0).toBeCloseTo(17 + 100, 0);
  });

  it("should pause animation", () => {
    const animator = new Animator({ fps: 60 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0); // Initial RAF

    vi.advanceTimersByTime(50);
    runRafCallbacks(50); // Advance ~3 frames
    const callsBeforePause = frameCallback.mock.calls.length;
    expect(callsBeforePause).toBeGreaterThan(0); // Should have been called

    animator.pause(); // This calls cancelAnimationFrame
    const rafCountAfterPause = rafCallbacks.length;

    vi.advanceTimersByTime(100);
    runRafCallbacks(100); // Should not trigger frameCallback

    // Verify cancelAnimationFrame was effective (or callbacks array is empty)
    // Check frameCallback wasn't called further
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
    vi.advanceTimersByTime(100); // Pause duration
    runRafCallbacks(100); // Time advances, but no callback

    animator.start(frameCallback); // Resume (queues RAF again)
    runRafCallbacks(0); // Resume RAF call - callback time should still be lastTimeBeforePause
    const callsAfterResumeImmediate = frameCallback.mock.calls.length;
    expect(callsAfterResumeImmediate).toBeGreaterThan(callsBeforePause);
    expect(frameCallback.mock.lastCall?.[0] ?? 0).toBeCloseTo(
      lastTimeBeforePause ?? 0,
      0
    );

    vi.advanceTimersByTime(50);
    runRafCallbacks(50); // Advance after resume

    const callsAfterAdvance = frameCallback.mock.calls.length;
    const lastTimeAfterAdvance = frameCallback.mock.lastCall?.[0] ?? 0;

    expect(callsAfterAdvance).toBeGreaterThan(callsAfterResumeImmediate);
    // Check if the last call's time has advanced correctly (by ~50ms)
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

    animator.stop(); // Pauses and resets time
    expect(animator.getCurrentTimelineTimeMs()).toBe(0);

    vi.advanceTimersByTime(100);
    runRafCallbacks(100); // Should not trigger callback
    expect(frameCallback).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it("should change speed", () => {
    const animator = new Animator({ fps: 60, initialSpeed: 1 });
    const frameCallback = vi.fn();
    animator.start(frameCallback);
    runRafCallbacks(0);

    vi.advanceTimersByTime(50);
    runRafCallbacks(50); // ~3 frames at speed 1
    const callsAtSpeed1 = frameCallback.mock.calls.length;
    const timeAtSpeed1 = frameCallback.mock.lastCall?.[0] ?? 0;
    expect(callsAtSpeed1).toBeGreaterThan(0);
    expect(timeAtSpeed1).toBeCloseTo(50, 0);

    animator.setSpeed(2);
    // Advance 50ms real time, should advance timeline by 100ms
    vi.advanceTimersByTime(50);
    runRafCallbacks(50);
    const callsAtSpeed2 = frameCallback.mock.calls.length;
    const timeAtSpeed2 = frameCallback.mock.lastCall?.[0] ?? 0;

    expect(callsAtSpeed2).toBeGreaterThan(callsAtSpeed1);
    expect(timeAtSpeed2).toBeGreaterThan(timeAtSpeed1);
    // Timeline time should advance by roughly 100ms (50ms * 2)
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

    // Advance one frame's worth of real time
    const frameDuration = 1000 / 60;
    vi.advanceTimersByTime(frameDuration);
    runRafCallbacks(frameDuration);

    expect(frameCallback).toHaveBeenCalledTimes(2); // Initial call + call after set time + advance
    // Callback time should be the set time + timeline advance for one frame
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

    animator.destroy(); // Calls stop -> pause -> cancelAnimationFrame
    expect(cancelSpy).toHaveBeenCalled();
    expect(animator.getCurrentTimelineTimeMs()).toBe(0);

    const callsBeforeDestroy = frameCallback.mock.calls.length;

    // Try advancing time after destroy
    vi.advanceTimersByTime(100);
    runRafCallbacks(100); // Should not trigger callback

    expect(frameCallback).toHaveBeenCalledTimes(callsBeforeDestroy);
  });
});
