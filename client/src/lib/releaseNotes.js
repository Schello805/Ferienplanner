export const RELEASE_NOTES = {
  release: '1.3.0',
  date: '19.09.2026',
};

export const getReleaseNotesStorageKey = (release = RELEASE_NOTES.release) =>
  `ferienplaner.release-notes.seen.${release}`;

export const hasSeenReleaseNotes = (storage, release = RELEASE_NOTES.release) => {
  try {
    return storage?.getItem(getReleaseNotesStorageKey(release)) === 'true';
  } catch {
    return false;
  }
};

export const markReleaseNotesSeen = (storage, release = RELEASE_NOTES.release) => {
  try {
    storage?.setItem(getReleaseNotesStorageKey(release), 'true');
  } catch {
    // The dialog still works when browser storage is unavailable.
  }
};
