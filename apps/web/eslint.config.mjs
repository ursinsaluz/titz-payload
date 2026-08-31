import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'

/**
 * Nur echte Fehler, keine Stilregeln — die macht Prettier.
 *
 * Der Nutzen hier sind ungenutzte Importe und Variablen: In `.astro`-Dateien
 * fallen die sonst nirgends auf, weil `astro check` sie nur als Hinweis führt
 * und der Build sie stillschweigend wegoptimiert.
 */
export default [
  { ignores: ['dist/', '.astro/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Die Datenschicht castet an den Rändern bewusst — dokumentiert in
      // src/lib/schemas.ts. Ein Verbot würde dort nur `unknown`-Ketten erzwingen.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
