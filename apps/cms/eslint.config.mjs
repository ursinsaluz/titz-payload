import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * Flache Konfiguration ohne `FlatCompat`.
 *
 * `eslint-config-next` liefert seit Version 16 selbst flache Configs; der
 * Umweg über `FlatCompat` warf damit einen Zirkularitätsfehler beim
 * Serialisieren. `next lint` gibt es in Next 16 ausserdem nicht mehr — das
 * `lint`-Skript ruft jetzt direkt `eslint` auf.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // Erzeugtes und Gebautes prüft niemand von Hand nach.
    ignores: [
      '.next/',
      '.open-next/',
      '.wrangler/',
      'cloudflare-env.d.ts',
      'src/payload-types.ts',
      'src/migrations/',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
]

export default eslintConfig
