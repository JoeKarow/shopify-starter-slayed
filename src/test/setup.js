import { vi } from 'vitest'

// Mock Shopify global objects
global.Shopify = {
  theme: {
    name: 'Test Theme'
  },
  currency: {
    active: 'USD'
  }
}

// Mock window.Alpine if using AlpineJS in tests
global.Alpine = {
  data: vi.fn(),
  store: vi.fn()
}