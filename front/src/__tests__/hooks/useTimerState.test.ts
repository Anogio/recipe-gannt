import { renderHook, act } from '@testing-library/react';
import { useTimerState } from '@/hooks/useTimerState';

describe('useTimerState Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty timers and timerCompleted', () => {
    const { result } = renderHook(() => useTimerState());
    const [timers, timerCompleted] = result.current;

    expect(timers).toEqual({});
    expect(timerCompleted.size).toBe(0);
  });

  it('should start a timer correctly', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    act(() => {
      startTimer('step1', 5);
    });

    const [timers, timerCompleted] = result.current;
    expect(timers['step1']).toEqual({
      remainingSeconds: 300,
      isRunning: true,
    });
    expect(timerCompleted.has('step1')).toBe(false);
  });

  it('should pause a timer correctly', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer, pauseTimer] = result.current;

    act(() => {
      startTimer('step1', 5);
      pauseTimer('step1');
    });

    const [timers] = result.current;
    expect(timers['step1'].isRunning).toBe(false);
    expect(timers['step1'].remainingSeconds).toBe(300);
  });

  it('should reset a timer correctly', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer, , resetTimer] = result.current;

    act(() => {
      startTimer('step1', 5);
      jest.advanceTimersByTime(1000); // Advance 1 second
      resetTimer('step1', 5);
    });

    const [timers, timerCompleted] = result.current;
    expect(timers['step1']).toEqual({
      remainingSeconds: 300,
      isRunning: false,
    });
    expect(timerCompleted.has('step1')).toBe(false);
  });

  it('should count down timer correctly', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    act(() => {
      startTimer('step1', 1); // 1 minute = 60 seconds
    });

    // Advance time by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    let [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(30);

    // Advance time by remaining 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(0);
    expect(timers['step1'].isRunning).toBe(false);
  });

  it('should add timer to completed set when countdown finishes', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    act(() => {
      startTimer('step1', 0.1); // 6 seconds for faster test
    });

    // Advance time by 6 seconds to complete timer
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    const [, timerCompleted] = result.current;
    expect(timerCompleted.has('step1')).toBe(true);
  });

  it('should handle multiple timers correctly', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    act(() => {
      startTimer('step1', 1);
      startTimer('step2', 2);
    });

    let [timers] = result.current;
    expect(Object.keys(timers)).toHaveLength(2);
    expect(timers['step1'].remainingSeconds).toBe(60);
    expect(timers['step2'].remainingSeconds).toBe(120);

    // Advance time by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(30);
    expect(timers['step2'].remainingSeconds).toBe(90);
  });

  it('should not advance completed timers', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    act(() => {
      startTimer('step1', 0.1); // 6 seconds
    });

    // Complete the timer
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    let [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(0);
    expect(timers['step1'].isRunning).toBe(false);

    // Advance more time - should not go negative
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(0);
  });

  it('should continue timer when startTimer is called on existing timer', () => {
    const { result } = renderHook(() => useTimerState());
    const [, , startTimer] = result.current;

    // Start timer
    act(() => {
      startTimer('step1', 1);
    });

    // Advance some time
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    let [timers] = result.current;
    expect(timers['step1'].remainingSeconds).toBe(30);

    // Start timer again - should continue from existing remaining seconds
    act(() => {
      startTimer('step1', 1);
    });

    [timers] = result.current;
    // The timer should continue from where it left off (30 seconds)
    // because startTimer uses existing remainingSeconds if available
    expect(timers['step1'].remainingSeconds).toBe(30);
    expect(timers['step1'].isRunning).toBe(true);
  });
});