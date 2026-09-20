import { beforeAll, afterAll, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
})()

// node 环境下没有 window；jsdom 环境下直接挂到 window
const globalScope = globalThis as unknown as { window?: unknown; localStorage: Storage }

beforeAll(() => {
  if (!globalScope.window) {
    Object.defineProperty(globalScope, 'window', {
      value: globalScope,
      configurable: true,
    })
  }
  Object.defineProperty(globalScope, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  })
})

afterEach(() => {
  // Clear localStorage after each test
  localStorage.clear()
})

afterAll(() => {
  // Cleanup after all tests
})
