import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const normalize = (value) => String(value || '').trim()
const getGitRevision = () => {
  const fromEnv = normalize(process.env.APP_GIT_REVISION || process.env.GIT_COMMIT || process.env.SOURCE_VERSION)
  if (fromEnv) return fromEnv.slice(0, 8)

  try {
    return normalize(execSync('git rev-parse --short=8 HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    })).slice(0, 8)
  } catch {
    return ''
  }
}
const getBuildVersion = (releaseVersion) => {
  const normalizedRelease = normalize(releaseVersion) || '0.0.0'
  const revision = getGitRevision()
  return revision ? `${normalizedRelease}+${revision}` : normalizedRelease
}

const releaseVersion = process.env.npm_package_version || '0.0.0'
const appBuildVersion = getBuildVersion(releaseVersion)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appBuildVersion),
    __APP_RELEASE_VERSION__: JSON.stringify(releaseVersion),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
