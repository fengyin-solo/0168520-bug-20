import { beforeAll, afterAll, afterEach } from 'vitest'

// Mock localStorage（同时兼容 node 与浏览器测试环境）
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

const globalScope = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
  localStorage?: typeof localStorageMock
}
globalScope.localStorage = localStorageMock

beforeAll(() => {
  // Setup before all tests
})

afterEach(() => {
  // Clear localStorage after each test
  localStorage.clear()
})

afterAll(() => {
  // Cleanup after all tests
})
