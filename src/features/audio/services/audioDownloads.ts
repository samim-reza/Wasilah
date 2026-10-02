/**
 * Recitation kept on the device, a surah at a time, for listening offline.
 *
 * The user asks for it — a download button per surah — rather than the app
 * caching audio on its own: a surah can be tens of megabytes, and that is the
 * user's storage and data to spend.
 *
 * Files live under the app's documents directory, one folder per reciter and
 * surah, one file per ayah. A small manifest in key-value storage says which
 * surahs are complete, with the word timings each track came with, so a
 * downloaded surah plays with no network at all — not even to fetch the list
 * of what to play.
 *
 * Downloads are tracked here, outside React, so one keeps going when the
 * reader is closed and shows its progress again when it is reopened.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { logger } from '@/lib/monitoring/logger';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import type { AudioTrack } from '../types/audio.types';

export const downloadsSupported = true;

/** Ayahs fetched at once: quick on a good connection, gentle on a poor one. */
const CONCURRENCY = 3;

interface DownloadedTrack {
  verseKey: string;
  verseNumber: number;
  fileName: string;
  segments: number[][] | null;
}

interface DownloadedChapter {
  tracks: DownloadedTrack[];
  bytes: number;
  completedAt: string;
}

type Manifest = Record<string, DownloadedChapter>;

export interface DownloadProgress {
  done: number;
  total: number;
}

export type DownloadState =
  | { status: 'none' }
  | { status: 'downloading'; progress: DownloadProgress }
  | { status: 'downloaded'; bytes: number }
  | { status: 'failed' };

function keyFor(recitationId: number, chapterId: number): string {
  return `${recitationId}:${chapterId}`;
}

function folderFor(recitationId: number, chapterId: number): Directory {
  return new Directory(Paths.document, 'recitations', String(recitationId), String(chapterId));
}

/** Each entry must carry its track list, or playing it would throw. */
function isManifest(value: unknown): value is Manifest {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => isRecord(entry) && Array.isArray(entry['tracks']))
  );
}

async function readManifest(): Promise<Manifest> {
  return (await keyValueStore.get(storageKeys.audioDownloads, isManifest)) ?? {};
}

async function writeManifest(manifest: Manifest): Promise<void> {
  await keyValueStore.set(storageKeys.audioDownloads, manifest);
}

// --- Progress, shared with every screen that is watching -------------------

type Listener = (state: DownloadState) => void;
const listeners = new Map<string, Set<Listener>>();
const running = new Map<string, { progress: DownloadProgress; cancelled: boolean }>();

function emit(key: string, state: DownloadState): void {
  for (const listener of listeners.get(key) ?? []) listener(state);
}

export function subscribeToDownload(
  recitationId: number,
  chapterId: number,
  listener: Listener,
): () => void {
  const key = keyFor(recitationId, chapterId);
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
  };
}

/** Where a surah stands: on the device, on its way, or not there. */
export async function downloadState(
  recitationId: number,
  chapterId: number,
): Promise<DownloadState> {
  const key = keyFor(recitationId, chapterId);
  const active = running.get(key);
  if (active) return { status: 'downloading', progress: active.progress };

  const entry = (await readManifest())[key];
  return entry ? { status: 'downloaded', bytes: entry.bytes } : { status: 'none' };
}

/**
 * The surah's tracks as local files, or null when it is not downloaded.
 *
 * Checks that the first and last files are still there: the OS or the user
 * can clear app storage, and a manifest pointing at missing files would play
 * silence.
 */
export async function downloadedTracks(
  recitationId: number,
  chapterId: number,
): Promise<AudioTrack[] | null> {
  const entry = (await readManifest())[keyFor(recitationId, chapterId)];
  if (!entry || entry.tracks.length === 0) return null;

  const folder = folderFor(recitationId, chapterId);
  const first = entry.tracks[0]!;
  const last = entry.tracks[entry.tracks.length - 1]!;
  if (!new File(folder, first.fileName).exists || !new File(folder, last.fileName).exists) {
    logger.warn('audio.downloadMissingFiles', { recitationId, chapterId });
    return null;
  }

  return entry.tracks.map((track) => ({
    verseKey: track.verseKey,
    url: new File(folder, track.fileName).uri,
    chapterId,
    verseNumber: track.verseNumber,
    segments: track.segments,
  }));
}

/** Downloads every ayah of a surah. Resolves when done, failed or cancelled. */
export async function downloadChapter(
  recitationId: number,
  chapterId: number,
  tracks: readonly AudioTrack[],
): Promise<void> {
  const key = keyFor(recitationId, chapterId);
  if (running.has(key) || tracks.length === 0) return;

  const job = { progress: { done: 0, total: tracks.length }, cancelled: false };
  running.set(key, job);
  emit(key, { status: 'downloading', progress: job.progress });

  const folder = folderFor(recitationId, chapterId);
  const saved: DownloadedTrack[] = [];
  let bytes = 0;

  try {
    folder.create({ intermediates: true, idempotent: true });

    let next = 0;
    const worker = async () => {
      while (next < tracks.length && !job.cancelled) {
        const track = tracks[next]!;
        next += 1;

        const fileName = `${track.verseNumber}.mp3`;
        const target = new File(folder, fileName);
        // A download that was cancelled or failed part-way left whole files
        // behind; they are kept rather than fetched again.
        const file = target.exists
          ? target
          : await File.downloadFileAsync(track.url, target, { idempotent: true });

        bytes += file.size ?? 0;
        saved.push({
          verseKey: track.verseKey,
          verseNumber: track.verseNumber,
          fileName,
          segments: track.segments,
        });
        job.progress = { done: job.progress.done + 1, total: tracks.length };
        emit(key, { status: 'downloading', progress: job.progress });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (job.cancelled) {
      emit(key, { status: 'none' });
      return;
    }

    saved.sort((a, b) => a.verseNumber - b.verseNumber);
    const manifest = await readManifest();
    manifest[key] = { tracks: saved, bytes, completedAt: new Date().toISOString() };
    await writeManifest(manifest);
    emit(key, { status: 'downloaded', bytes });
  } catch (error) {
    logger.warn('audio.downloadFailed', { recitationId, chapterId, error });
    emit(key, { status: 'failed' });
  } finally {
    running.delete(key);
  }
}

/** Stops a download in progress. Files already fetched are kept for next time. */
export function cancelDownload(recitationId: number, chapterId: number): void {
  const job = running.get(keyFor(recitationId, chapterId));
  if (job) job.cancelled = true;
}

/** Deletes a downloaded surah and frees its space. */
export async function removeDownload(recitationId: number, chapterId: number): Promise<void> {
  const key = keyFor(recitationId, chapterId);
  cancelDownload(recitationId, chapterId);

  try {
    const folder = folderFor(recitationId, chapterId);
    if (folder.exists) folder.delete();
  } catch (error) {
    logger.warn('audio.downloadRemoveFailed', { recitationId, chapterId, error });
  }

  const manifest = await readManifest();
  delete manifest[key];
  await writeManifest(manifest);
  emit(key, { status: 'none' });
}
