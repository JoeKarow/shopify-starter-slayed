/**
 * Real User Monitoring (RUM) Collection with Web Vitals
 * T077: Setup RUM collection with Web Vitals library
 *
 * This module collects Core Web Vitals and other performance metrics
 * from real users in production for continuous performance monitoring.
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP } from 'web-vitals'
import type { CLSMetric, FCPMetric, FIDMetric, LCPMetric, TTFBMetric, INPMetric } from 'web-vitals'

/**
 * Performance metric data structure
 */
export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  url: string
  userAgent: string
  connectionType?: string
  deviceMemory?: number
  isBot?: boolean
  sessionId: string
  userId?: string
  shopDomain: string
  template: string
  version: string
}

/**
 * RUM configuration options
 */
export interface RUMConfig {
  /** Analytics endpoint URL */
  endpoint?: string
  /** Sample rate (0-1) for data collection */
  sampleRate?: number
  /** Debug mode for development */
  debug?: boolean
  /** Custom user identifier */
  userId?: string
  /** Additional metadata */
  metadata?: Record<string, any>
  /** Batch size for sending metrics */
  batchSize?: number
  /** Buffer timeout in milliseconds */
  bufferTimeout?: number
}

/**
 * Default RUM configuration
 */
const DEFAULT_CONFIG: Required<RUMConfig> = {
  endpoint: '/analytics/performance',
  sampleRate: 1.0, // 100% sampling in development
  debug: false,
  userId: '',
  metadata: {},
  batchSize: 10,
  bufferTimeout: 5000
}

/**
 * RUM Collector Class
 */
class RUMCollector {
  private config: Required<RUMConfig>
  private metrics: PerformanceMetric[] = []
  private sessionId: string
  private bufferTimer?: number

  constructor(config: RUMConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.initialize()
  }

  /**
   * Initialize RUM collection
   */
  private initialize(): void {
    // Check if we should collect data (sampling)
    if (Math.random() > this.config.sampleRate) {
      if (this.config.debug) {
        console.log('RUM: Skipped due to sampling rate')
      }
      return
    }

    // Skip if this looks like a bot
    if (this.isBot()) {
      if (this.config.debug) {
        console.log('RUM: Skipped - detected bot')
      }
      return
    }

    // Initialize Web Vitals collection
    this.initializeWebVitals()

    // Set up page unload handler to send remaining metrics
    window.addEventListener('beforeunload', () => {
      this.flush(true)
    })

    // Set up visibility change handler for SPA navigation
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true)
      }
    })

    if (this.config.debug) {
      console.log('RUM: Initialized with config:', this.config)
    }
  }

  /**
   * Initialize Web Vitals metric collection
   */
  private initializeWebVitals(): void {
    // Largest Contentful Paint
    onLCP((metric: LCPMetric) => {
      this.collectMetric('LCP', metric.value, this.getLCPRating(metric.value), {
        element: metric.entries[metric.entries.length - 1]?.element?.tagName,
        url: metric.entries[metric.entries.length - 1]?.url
      })
    })

    // First Contentful Paint
    onFCP((metric: FCPMetric) => {
      this.collectMetric('FCP', metric.value, this.getFCPRating(metric.value))
    })

    // Cumulative Layout Shift
    onCLS((metric: CLSMetric) => {
      this.collectMetric('CLS', metric.value, this.getCLSRating(metric.value), {
        entries: metric.entries.length
      })
    })

    // First Input Delay (deprecated but still useful)
    onFID((metric: FIDMetric) => {
      this.collectMetric('FID', metric.value, this.getFIDRating(metric.value), {
        eventType: metric.entries[0]?.name
      })
    })

    // Interaction to Next Paint (new metric)
    onINP((metric: INPMetric) => {
      this.collectMetric('INP', metric.value, this.getINPRating(metric.value), {
        eventType: metric.entries[0]?.name
      })
    })

    // Time to First Byte
    onTTFB((metric: TTFBMetric) => {
      this.collectMetric('TTFB', metric.value, this.getTTFBRating(metric.value))
    })

    // Custom metrics
    this.collectCustomMetrics()
  }

  /**
   * Collect custom performance metrics
   */
  private collectCustomMetrics(): void {
    // Time to Interactive (estimated)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const tti = navigation.domInteractive - navigation.fetchStart
      this.collectMetric('TTI', tti, this.getTTIRating(tti))
    }

    // DOM Content Loaded
    window.addEventListener('DOMContentLoaded', () => {
      const dcl = performance.now()
      this.collectMetric('DCL', dcl, dcl < 1500 ? 'good' : dcl < 3000 ? 'needs-improvement' : 'poor')
    })

    // Connection information
    const connection = (navigator as any).connection
    if (connection) {
      this.collectMetric('NET_TYPE', 0, 'good', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      })
    }

    // Device information
    const deviceMemory = (navigator as any).deviceMemory
    if (deviceMemory) {
      this.collectMetric('DEVICE_MEMORY', deviceMemory, deviceMemory >= 4 ? 'good' : 'poor')
    }
  }

  /**
   * Collect a performance metric
   */
  private collectMetric(
    name: string,
    value: number,
    rating: 'good' | 'needs-improvement' | 'poor',
    metadata: Record<string, any> = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceMemory: (navigator as any).deviceMemory,
      isBot: this.isBot(),
      sessionId: this.sessionId,
      userId: this.config.userId,
      shopDomain: this.getShopDomain(),
      template: this.getCurrentTemplate(),
      version: this.getThemeVersion(),
      ...metadata
    }

    this.metrics.push(metric)

    if (this.config.debug) {
      console.log('RUM: Collected metric:', metric)
    }

    // Check if we should send metrics
    if (this.metrics.length >= this.config.batchSize) {
      this.flush()
    } else if (!this.bufferTimer) {
      this.bufferTimer = window.setTimeout(() => {
        this.flush()
      }, this.config.bufferTimeout)
    }
  }

  /**
   * Flush metrics to analytics endpoint
   */
  private flush(immediate = false): void {
    if (this.metrics.length === 0) return

    const metricsToSend = [...this.metrics]
    this.metrics = []

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer)
      this.bufferTimer = undefined
    }

    // Send metrics
    this.sendMetrics(metricsToSend, immediate)
  }

  /**
   * Send metrics to analytics endpoint
   */
  private sendMetrics(metrics: PerformanceMetric[], immediate = false): void {
    const payload = {
      metrics,
      session: {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        referrer: document.referrer,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      metadata: this.config.metadata
    }

    if (this.config.debug) {
      console.log('RUM: Sending metrics:', payload)
    }

    // Use sendBeacon for reliable delivery during page unload
    if (immediate && 'sendBeacon' in navigator) {
      const success = navigator.sendBeacon(
        this.config.endpoint,
        JSON.stringify(payload)
      )
      if (this.config.debug) {
        console.log('RUM: Beacon sent:', success)
      }
    } else {
      // Use fetch for normal sending
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: immediate
      }).catch(error => {
        if (this.config.debug) {
          console.error('RUM: Failed to send metrics:', error)
        }
      })
    }
  }

  /**
   * Rating functions for Core Web Vitals
   */
  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
  }

  private getINPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
  }

  private getTTIRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 3500 ? 'good' : value <= 5800 ? 'needs-improvement' : 'poor'
  }

  /**
   * Utility functions
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private isBot(): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /crawling/i, /google/i, /facebook/i,
      /twitter/i, /lighthouse/i, /pagespeed/i, /gtmetrix/i, /pingdom/i
    ]
    return botPatterns.some(pattern => pattern.test(navigator.userAgent))
  }

  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection
    return connection?.effectiveType || connection?.type
  }

  private getShopDomain(): string {
    const shopDomain = (window as any).Shopify?.shop
    return shopDomain || window.location.hostname
  }

  private getCurrentTemplate(): string {
    const template = document.body.dataset.template ||
                    (window as any).Shopify?.template ||
                    'unknown'
    return template
  }

  private getThemeVersion(): string {
    const version = document.querySelector('meta[name="theme-version"]')?.getAttribute('content')
    return version || '1.0.0'
  }

  /**
   * Public method to collect custom metrics
   */
  public collectCustomMetric(
    name: string,
    value: number,
    rating: 'good' | 'needs-improvement' | 'poor' = 'good',
    metadata: Record<string, any> = {}
  ): void {
    this.collectMetric(name, value, rating, metadata)
  }

  /**
   * Public method to update configuration
   */
  public updateConfig(newConfig: Partial<RUMConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Initialize RUM collection
 */
export function initializeRUM(config: RUMConfig = {}): RUMCollector {
  // Check if RUM should be enabled
  const isProduction = window.location.hostname !== 'localhost' &&
                      !window.location.hostname.includes('127.0.0.1')

  const isDevelopment = !isProduction

  // Default configuration based on environment
  const defaultConfig: RUMConfig = {
    debug: isDevelopment,
    sampleRate: isProduction ? 0.1 : 1.0, // 10% sampling in production, 100% in dev
    endpoint: '/analytics/performance',
    batchSize: isProduction ? 20 : 5,
    bufferTimeout: isProduction ? 10000 : 3000,
    ...config
  }

  return new RUMCollector(defaultConfig)
}

/**
 * Shopify-specific RUM initialization
 */
export function initializeShopifyRUM(): RUMCollector {
  const shopDomain = (window as any).Shopify?.shop || window.location.hostname
  const customerId = (window as any).Shopify?.customer?.id

  return initializeRUM({
    userId: customerId ? String(customerId) : undefined,
    metadata: {
      shop: shopDomain,
      currency: (window as any).Shopify?.currency?.active || 'USD',
      locale: (window as any).Shopify?.locale || 'en',
      theme: {
        name: 'Shopify Starter Slayed',
        version: document.querySelector('meta[name="theme-version"]')?.getAttribute('content') || '1.0.0'
      }
    }
  })
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window as any).RUM = initializeShopifyRUM()
    })
  } else {
    (window as any).RUM = initializeShopifyRUM()
  }
}

export default RUMCollector