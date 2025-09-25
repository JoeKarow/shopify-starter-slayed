/**
 * Network Information API Wrapper
 *
 * Provides a unified interface for network information and monitoring
 * with fallbacks for browsers that don't support the API
 */

export interface NetworkInformation {
  downlink?: number           // Bandwidth in Mbps
  downlinkMax?: number        // Max bandwidth in Mbps
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  rtt?: number               // Round-trip time in milliseconds
  saveData?: boolean         // User preference for reduced data usage
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'
}

export interface NetworkStatus {
  isOnline: boolean
  speed: 'slow' | 'medium' | 'fast'
  type: 'unknown' | 'wifi' | 'cellular' | 'ethernet' | 'other'
  saveData: boolean
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number           // Mbps
  rtt: number               // milliseconds
  isMetered: boolean        // Estimated based on connection type
}

export type NetworkChangeCallback = (status: NetworkStatus) => void

/**
 * Network Information Manager
 */
export class NetworkManager {
  private static instance: NetworkManager
  private callbacks = new Set<NetworkChangeCallback>()
  private currentStatus: NetworkStatus | null = null
  private isListening = false

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager()
    }
    return NetworkManager.instance
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    if (this.currentStatus) {
      return this.currentStatus
    }

    this.currentStatus = this.calculateNetworkStatus()
    return this.currentStatus
  }

  /**
   * Check if network is considered slow
   */
  isSlowNetwork(threshold = 1.5): boolean {
    const status = this.getNetworkStatus()
    return status.downlink < threshold || status.effectiveType === 'slow-2g' || status.effectiveType === '2g'
  }

  /**
   * Check if network is considered fast
   */
  isFastNetwork(threshold = 10): boolean {
    const status = this.getNetworkStatus()
    return status.downlink >= threshold && status.effectiveType === '4g'
  }

  /**
   * Get network speed estimate in Mbps
   */
  getDownlink(): number {
    const connection = this.getConnection()

    if (connection?.downlink) {
      return connection.downlink
    }

    // Fallback estimates based on effective type
    const effectiveType = connection?.effectiveType || 'unknown'
    const speedMap = {
      'slow-2g': 0.1,
      '2g': 0.25,
      '3g': 1.5,
      '4g': 10,
      'unknown': 5
    }

    return speedMap[effectiveType as keyof typeof speedMap] || 5
  }

  /**
   * Get round-trip time in milliseconds
   */
  getRTT(): number {
    const connection = this.getConnection()

    if (connection?.rtt) {
      return connection.rtt
    }

    // Fallback estimates
    const effectiveType = connection?.effectiveType || 'unknown'
    const rttMap = {
      'slow-2g': 2000,
      '2g': 1400,
      '3g': 400,
      '4g': 100,
      'unknown': 500
    }

    return rttMap[effectiveType as keyof typeof rttMap] || 500
  }

  /**
   * Check if user has save-data preference enabled
   */
  isSaveDataEnabled(): boolean {
    const connection = this.getConnection()
    return connection?.saveData === true
  }

  /**
   * Register callback for network changes
   */
  onNetworkChange(callback: NetworkChangeCallback): () => void {
    this.callbacks.add(callback)
    this.startListening()

    // Return cleanup function
    return () => {
      this.callbacks.delete(callback)
      if (this.callbacks.size === 0) {
        this.stopListening()
      }
    }
  }

  /**
   * Start listening for network changes
   */
  private startListening(): void {
    if (this.isListening) return

    this.isListening = true

    // Listen for online/offline events
    window.addEventListener('online', this.handleNetworkChange)
    window.addEventListener('offline', this.handleNetworkChange)

    // Listen for connection changes (if supported)
    const connection = this.getConnection()
    if (connection && 'addEventListener' in connection) {
      connection.addEventListener('change', this.handleConnectionChange)
    }
  }

  /**
   * Stop listening for network changes
   */
  private stopListening(): void {
    if (!this.isListening) return

    this.isListening = false

    window.removeEventListener('online', this.handleNetworkChange)
    window.removeEventListener('offline', this.handleNetworkChange)

    const connection = this.getConnection()
    if (connection && 'removeEventListener' in connection) {
      connection.removeEventListener('change', this.handleConnectionChange)
    }
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange = (): void => {
    this.currentStatus = null // Force recalculation
    const newStatus = this.getNetworkStatus()

    this.callbacks.forEach(callback => {
      try {
        callback(newStatus)
      } catch (error) {
        console.warn('Network change callback failed:', error)
      }
    })
  }

  /**
   * Handle connection property changes
   */
  private handleConnectionChange = (): void => {
    this.handleNetworkChange()
  }

  /**
   * Calculate current network status
   */
  private calculateNetworkStatus(): NetworkStatus {
    const connection = this.getConnection()
    const isOnline = navigator.onLine

    const downlink = this.getDownlink()
    const rtt = this.getRTT()
    const effectiveType = connection?.effectiveType || 'unknown'
    const saveData = connection?.saveData === true

    // Determine speed category
    let speed: 'slow' | 'medium' | 'fast'
    if (downlink < 1.5 || effectiveType === 'slow-2g' || effectiveType === '2g') {
      speed = 'slow'
    } else if (downlink >= 10 && effectiveType === '4g') {
      speed = 'fast'
    } else {
      speed = 'medium'
    }

    // Determine connection type
    const connectionType = connection?.type || 'unknown'
    let type: NetworkStatus['type']
    switch (connectionType) {
      case 'wifi':
      case 'ethernet':
        type = connectionType
        break
      case 'cellular':
        type = 'cellular'
        break
      default:
        type = isOnline ? 'unknown' : 'other'
    }

    // Estimate if connection is metered
    const isMetered = connectionType === 'cellular' || saveData

    return {
      isOnline,
      speed,
      type,
      saveData,
      effectiveType: effectiveType as NetworkStatus['effectiveType'],
      downlink,
      rtt,
      isMetered
    }
  }

  /**
   * Get the browser's connection object
   */
  private getConnection(): NetworkInformation | null {
    if (typeof navigator === 'undefined') {
      return null
    }

    // Try different browser prefixes
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection

    return connection || null
  }
}

/**
 * Global network manager instance
 */
export const networkManager = NetworkManager.getInstance()

/**
 * Utility functions for common network checks
 */

export function isOnline(): boolean {
  return networkManager.getNetworkStatus().isOnline
}

export function isSlowNetwork(threshold?: number): boolean {
  return networkManager.isSlowNetwork(threshold)
}

export function isFastNetwork(threshold?: number): boolean {
  return networkManager.isFastNetwork(threshold)
}

export function getNetworkSpeed(): number {
  return networkManager.getDownlink()
}

export function isSaveDataEnabled(): boolean {
  return networkManager.isSaveDataEnabled()
}

export function onNetworkChange(callback: NetworkChangeCallback): () => void {
  return networkManager.onNetworkChange(callback)
}

/**
 * Wait for network to become available
 */
export function waitForNetwork(timeout = 30000): Promise<NetworkStatus> {
  return new Promise((resolve, reject) => {
    const status = networkManager.getNetworkStatus()

    if (status.isOnline) {
      resolve(status)
      return
    }

    let timeoutId: NodeJS.Timeout
    const cleanup = networkManager.onNetworkChange((newStatus) => {
      if (newStatus.isOnline) {
        cleanup()
        if (timeoutId) clearTimeout(timeoutId)
        resolve(newStatus)
      }
    })

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Network timeout'))
    }, timeout)
  })
}

/**
 * Estimate data usage for a given size based on network conditions
 */
export function estimateDataUsage(sizeKB: number): {
  timeMs: number
  cost: 'low' | 'medium' | 'high'
  shouldDefer: boolean
} {
  const status = networkManager.getNetworkStatus()

  // Estimate transfer time
  const speedKBps = (status.downlink * 1024) / 8 // Convert Mbps to KB/s
  const timeMs = (sizeKB / speedKBps) * 1000

  // Estimate cost based on network type and user preferences
  let cost: 'low' | 'medium' | 'high' = 'low'
  if (status.isMetered || status.saveData) {
    cost = 'high'
  } else if (status.speed === 'slow') {
    cost = 'medium'
  }

  // Should we defer this download?
  const shouldDefer = status.saveData ||
                     (status.isMetered && sizeKB > 100) ||
                     (status.speed === 'slow' && sizeKB > 50)

  return {
    timeMs,
    cost,
    shouldDefer
  }
}