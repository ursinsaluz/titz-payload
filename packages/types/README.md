# @titz/types

Generierte Typen des Payload-Content-Modells, gemeinsam genutzt von `apps/cms`
und `apps/web`.

`src/payload.ts` **nicht von Hand bearbeiten**. Die Datei entsteht aus
`apps/cms/src/payload-types.ts`:

```bash
pnpm generate:types
```

Sie ist eingecheckt, damit ein Frontend-Build ohne laufendes CMS auskommt.
