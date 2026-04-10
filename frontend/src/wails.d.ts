// Type declarations for Wails runtime
// In dev mode, Wails provides these via the generated directory
// In production, we use the compiled bindings

declare module '*/wailsjs/runtime/runtime' {
  export function EventsOn(eventName: string, callback: (...data: any[]) => void): () => void
  export function EventsOff(eventName: string, ...additionalEventNames: string[]): void
  export function EventsEmit(eventName: string, ...data: any[]): void
  export function WindowSetTitle(title: string): void
  export function WindowSetSize(width: number, height: number): void
  export function BrowserOpenURL(url: string): void
}
