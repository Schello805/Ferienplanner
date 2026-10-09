import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Keep tests independent of Node's optional file-backed localStorage implementation.
const localStorageValues = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() {
      return localStorageValues.size;
    },
    clear: () => localStorageValues.clear(),
    getItem: (key) => localStorageValues.get(String(key)) ?? null,
    key: (index) => [...localStorageValues.keys()][index] ?? null,
    removeItem: (key) => localStorageValues.delete(String(key)),
    setItem: (key, value) => localStorageValues.set(String(key), String(value)),
  },
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
