import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

describe('public changelog', () => {
    it('matches the canonical project changelog', () => {
        const projectChangelog = readFileSync(resolve(process.cwd(), '..', 'CHANGELOG.md'), 'utf8');
        const publicChangelog = readFileSync(resolve(process.cwd(), 'public', 'CHANGELOG.md'), 'utf8');

        expect(publicChangelog).toBe(projectChangelog);
    });
});
