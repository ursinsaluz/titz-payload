import { defineConfig } from 'vitest/config'

/**
 * Nur Unit-Tests für reine Logik. Vorher lief hier jsdom samt React-Plugin für
 * einen einzigen Test, der eine ganze Payload-Instanz startete, um
 * `expect(users).toBeDefined()` zu prüfen — Datenbank nötig, Aussage null.
 * End-to-End gehört zu `apps/web`, wo die Seite entsteht.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
