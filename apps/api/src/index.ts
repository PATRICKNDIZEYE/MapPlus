// Type-only re-export — lets apps/web do `import type { AppRouter } from '@mallguide/api'`
// Nothing here runs in the browser; TypeScript strips `import type` at compile time
export type { AppRouter } from './trpc/trpc.router';
