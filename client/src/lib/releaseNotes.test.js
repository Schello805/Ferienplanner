import { describe, expect, it } from 'vitest';
import {
  RELEASE_NOTES,
  getReleaseNotesStorageKey,
  hasSeenReleaseNotes,
  markReleaseNotesSeen,
} from './releaseNotes.js';

describe('release notes visibility', () => {
  it('zeigt ein neues Release genau einmal pro lokalem Browserprofil', () => {
    const storage = new Map();
    const adapter = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    };

    expect(RELEASE_NOTES.release).toBe('1.3.2');
    expect(hasSeenReleaseNotes(adapter, RELEASE_NOTES.release)).toBe(false);
    markReleaseNotesSeen(adapter, RELEASE_NOTES.release);
    expect(hasSeenReleaseNotes(adapter, RELEASE_NOTES.release)).toBe(true);
    expect(storage.get(getReleaseNotesStorageKey(RELEASE_NOTES.release))).toBe('true');
    expect(hasSeenReleaseNotes(adapter, '1.3.3')).toBe(false);
  });
});
