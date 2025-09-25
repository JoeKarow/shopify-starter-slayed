/**
 * Vite ImportMeta types for TypeScript
 */

interface ImportMetaEnv {
  [key: string]: any
  MODE: string
  DEV: boolean
  PROD: boolean
  SSR: boolean
}

interface HotContext {
  readonly data: any
  accept(): void
  accept(cb: (mod: any) => void): void
  accept(deps: string[], cb: (mods: any[]) => void): void
  dispose(cb: (data: any) => void): void
  decline(): void
  invalidate(): void
  on<T extends string>(
    event: T,
    cb: (payload: T extends 'vite:beforeUpdate' | 'vite:afterUpdate' ? any[] : any) => void
  ): void
  off<T extends string>(
    event: T,
    cb: (payload: T extends 'vite:beforeUpdate' | 'vite:afterUpdate' ? any[] : any) => void
  ): void
  send<T extends string>(event: T, data?: any): void
}

interface ImportMeta {
  url: string
  readonly env: ImportMetaEnv
  readonly hot?: HotContext

  glob<T = any>(
    pattern: string,
    options?: {
      eager?: boolean
      import?: string
      as?: string
    }
  ): Record<string, T | (() => Promise<T>)>

  globEager<T = any>(pattern: string): Record<string, T>
}