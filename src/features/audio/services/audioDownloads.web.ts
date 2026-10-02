/**
 * The web build has no app file system to download into, so recitation is
 * always streamed there; the reader hides the download button.
 */
import type { AudioTrack } from '../types/audio.types';

export type DownloadState =
  | { status: 'none' }
  | { status: 'downloading'; progress: { done: number; total: number } }
  | { status: 'downloaded'; bytes: number }
  | { status: 'failed' };

export const downloadsSupported = false;

export function subscribeToDownload(): () => void {
  return () => undefined;
}

export async function downloadState(): Promise<DownloadState> {
  return { status: 'none' };
}

export async function downloadedTracks(): Promise<AudioTrack[] | null> {
  return null;
}

export async function downloadChapter(): Promise<void> {}

export function cancelDownload(): void {}

export async function removeDownload(): Promise<void> {}
