import { DestroyRef, inject, Service, signal } from '@angular/core';

import { RECORDING_MAX_DURATION_MS } from '@core/recordings/recording.constants';
import { pickRecordingMimeType } from '@core/recordings/recording.utils';

import { RecorderError } from './recorder-error';
import { RECORDER_TICK_MS } from './recording-new.constants';
import { RecordedClip } from './recording-new.model';
import { microphoneErrorKind, rmsLevel } from './recording-new.utils';

/**
 * The microphone of the record screen: records one clip at a time with `MediaRecorder`, stops itself
 * at 15 s, and samples the loudness with an `AnalyserNode` for the live bars.
 * Provided by the screen, so leaving it releases the microphone.
 */
@Service({ autoProvided: false })
export class AudioRecorder {
  /**
   * Microphone stream, held only while recording.
   */
  private stream: MediaStream | null = null;

  /**
   * Recorder of the current clip.
   */
  private recorder: MediaRecorder | null = null;

  /**
   * Audio graph feeding the analyser; `null` where the browser has none.
   */
  private context: AudioContext | null = null;

  /**
   * Loudness meter on the microphone.
   */
  private analyser: AnalyserNode | null = null;

  /**
   * Clock and meter timer.
   */
  private ticker: ReturnType<typeof setInterval> | undefined;

  /**
   * Instant recording started, from `performance.now()`.
   */
  private startedAt = 0;

  /**
   * Time recorded so far, in ms.
   */
  public readonly elapsedMs = signal(0);

  /**
   * Loudness samples of the current clip, 0 to 1, oldest first.
   */
  public readonly levels = signal<number[]>([]);

  /**
   * Set once the screen is gone, so a microphone granted afterwards is handed straight back.
   */
  private disposed = false;

  /**
   * Releases the microphone when the screen goes away, even mid-recording or before it is granted;
   * a clip still being finalised is dropped.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.disposed = true;
      if (this.recorder) {
        this.recorder.ondataavailable = null;
        this.recorder.onstop = null;
      }
      this.release();
    });
  }

  /**
   * Asks for the microphone and records until `stop()` or the 15 s cap; resolves with the clip.
   * Rejects with a `RecorderError` saying why when recording is impossible.
   */
  public async record(): Promise<RecordedClip> {
    const mimeType = this.supportedMimeType();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      throw new RecorderError(microphoneErrorKind(error));
    }
    if (this.disposed) {
      this.release();
      throw new RecorderError('failed');
    }
    return new Promise<RecordedClip>((resolve, reject) => this.start(mimeType, resolve, reject));
  }

  /**
   * Ends the recording; `record()` then resolves with the clip.
   */
  public stop(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
  }

  /**
   * Stops everything and hands the microphone back to the system.
   */
  public release(): void {
    clearInterval(this.ticker);
    this.ticker = undefined;
    if (this.recorder?.state === 'recording') {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.recorder = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.analyser = null;
  }

  /**
   * Format to record in; throws `unsupported` when this browser cannot record any the API accepts.
   */
  private supportedMimeType(): string {
    const supported =
      typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const mimeType = supported
      ? pickRecordingMimeType((type) => MediaRecorder.isTypeSupported(type))
      : null;
    if (!mimeType) {
      throw new RecorderError('unsupported');
    }
    return mimeType;
  }

  /**
   * Starts the recorder, the meter and the clock on the open stream.
   */
  private start(
    mimeType: string,
    resolve: (clip: RecordedClip) => void,
    reject: (error: RecorderError) => void,
  ): void {
    const stream = this.stream;
    if (!stream) {
      reject(new RecorderError('failed'));
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      this.release();
      reject(new RecorderError('failed'));
      return;
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      const clip: RecordedClip = {
        blob: new Blob(chunks, { type: recorder.mimeType || mimeType }),
        durationMs: Math.min(RECORDING_MAX_DURATION_MS, Math.max(1, this.elapsedMs())),
        levels: this.levels(),
      };
      this.release();
      resolve(clip);
    };
    recorder.onerror = () => {
      this.release();
      reject(new RecorderError('failed'));
    };
    this.recorder = recorder;
    this.elapsedMs.set(0);
    this.levels.set([]);
    this.startMeter(stream);
    try {
      recorder.start();
    } catch {
      this.release();
      reject(new RecorderError('failed'));
      return;
    }
    this.startedAt = performance.now();
    this.ticker = setInterval(() => this.tick(), RECORDER_TICK_MS);
  }

  /**
   * Plugs the analyser on the microphone; recording still works without it, the bars just stay flat.
   */
  private startMeter(stream: MediaStream): void {
    if (typeof AudioContext === 'undefined') {
      return;
    }
    try {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.context.createMediaStreamSource(stream).connect(this.analyser);
    } catch {
      void this.context?.close().catch(() => undefined);
      this.context = null;
      this.analyser = null;
    }
  }

  /**
   * Advances the clock, samples the loudness, and stops at the cap.
   */
  private tick(): void {
    const elapsed = performance.now() - this.startedAt;
    this.elapsedMs.set(Math.min(RECORDING_MAX_DURATION_MS, elapsed));
    if (this.analyser) {
      const frame = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(frame);
      const level = rmsLevel(frame);
      this.levels.update((levels) => [...levels, level]);
    }
    if (elapsed >= RECORDING_MAX_DURATION_MS) {
      this.stop();
    }
  }
}
