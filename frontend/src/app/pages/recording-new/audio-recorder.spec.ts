import { TestBed } from '@angular/core/testing';

import { AudioRecorder } from './audio-recorder';
import { RecorderError } from './recorder-error';

/**
 * Stand-in for the browser's `MediaRecorder`: records "abc" and stops on demand.
 */
class FakeMediaRecorder {
  /**
   * Last recorder built.
   */
  public static last: FakeMediaRecorder | null = null;

  /**
   * Recorder state, as the real one reports it.
   */
  public state: 'inactive' | 'recording' = 'inactive';

  /**
   * Format asked for.
   */
  public readonly mimeType: string;

  /**
   * Receives the recorded data.
   */
  public ondataavailable: ((event: Pick<BlobEvent, 'data'>) => void) | null = null;

  /**
   * Called once stopped.
   */
  public onstop: (() => void) | null = null;

  /**
   * Called on a recording failure.
   */
  public onerror: (() => void) | null = null;

  /**
   * Remembers the format and itself.
   */
  constructor(_stream: MediaStream, options: MediaRecorderOptions) {
    this.mimeType = options.mimeType ?? '';
    FakeMediaRecorder.last = this;
  }

  /**
   * Formats this fake can record.
   */
  public static isTypeSupported(type: string): boolean {
    return type === 'audio/webm';
  }

  /**
   * Starts recording.
   */
  public start(): void {
    this.state = 'recording';
  }

  /**
   * Stops, hands over the data, then signals the end.
   */
  public stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['abc']) });
    this.onstop?.();
  }
}

describe('AudioRecorder', () => {
  let stopTrack: ReturnType<typeof vi.fn>;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let clock: number;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    stopTrack = vi.fn();
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    TestBed.configureTestingModule({ providers: [AudioRecorder] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Lets the microphone promise settle.
   */
  async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
  }

  it('records until stopped, in a format the API accepts, then frees the microphone', async () => {
    const recorder = TestBed.inject(AudioRecorder);
    const clip = recorder.record();
    await settle();

    clock = 2300;
    await vi.advanceTimersByTimeAsync(100);
    expect(recorder.elapsedMs()).toBe(2300);
    recorder.stop();

    const result = await clip;
    expect(result.blob.type).toBe('audio/webm');
    expect(result.durationMs).toBe(2300);
    expect(stopTrack).toHaveBeenCalled();
  });

  it('stops by itself at 30 seconds', async () => {
    const recorder = TestBed.inject(AudioRecorder);
    const clip = recorder.record();
    await settle();

    clock = 30_050;
    await vi.advanceTimersByTimeAsync(100);

    expect((await clip).durationMs).toBe(30_000);
  });

  it('says the microphone was refused', async () => {
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const recorder = TestBed.inject(AudioRecorder);

    await expect(recorder.record()).rejects.toEqual(new RecorderError('denied'));
  });

  it('says the browser cannot record at all', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const recorder = TestBed.inject(AudioRecorder);

    await expect(recorder.record()).rejects.toMatchObject({ kind: 'unsupported' });
  });

  it('frees the microphone when the browser refuses to build the recorder', async () => {
    vi.stubGlobal(
      'MediaRecorder',
      class extends FakeMediaRecorder {
        /**
         * Fails like a browser rejecting the options.
         */
        constructor(stream: MediaStream, options: MediaRecorderOptions) {
          super(stream, options);
          throw new DOMException('no', 'NotSupportedError');
        }
      },
    );
    const recorder = TestBed.inject(AudioRecorder);

    await expect(recorder.record()).rejects.toEqual(new RecorderError('failed'));
    expect(stopTrack).toHaveBeenCalled();
  });

  it('frees the microphone when the recorder fails to start', async () => {
    vi.stubGlobal(
      'MediaRecorder',
      class extends FakeMediaRecorder {
        /**
         * Fails like a recorder whose stream went away.
         */
        public override start(): void {
          throw new DOMException('no', 'InvalidStateError');
        }
      },
    );
    const recorder = TestBed.inject(AudioRecorder);

    await expect(recorder.record()).rejects.toEqual(new RecorderError('failed'));
    expect(stopTrack).toHaveBeenCalled();
  });

  it('releases a recording in progress', async () => {
    const recorder = TestBed.inject(AudioRecorder);
    void recorder.record();
    await settle();

    recorder.release();

    expect(stopTrack).toHaveBeenCalled();
    expect(FakeMediaRecorder.last?.state).toBe('inactive');
  });
});
