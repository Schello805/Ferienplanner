import { describe, expect, it } from 'vitest';
import {
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

    expect(hasSeenReleaseNotes(adapter, '1.3.0')).toBe(false);
    markReleaseNotesSeen(adapter, '1.3.0');
    expect(hasSeenReleaseNotes(adapter, '1.3.0')).toBe(true);
    expect(storage.get(getReleaseNotesStorageKey('1.3.0'))).toBe('true');
    expect(hasSeenReleaseNotes(adapter, '1.4.0')).toBe(false);
  });
});
