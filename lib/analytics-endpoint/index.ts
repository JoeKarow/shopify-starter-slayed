/**
 * Analytics Endpoint for RUM Data Collection
 * T078: Configure RUM data reporting to analytics endpoint
 *
 * This module provides server-side handling for Real User Monitoring (RUM) data
 * collected from the frontend Web Vitals implementation.
 */

import type { PerformanceMetric } from '../../frontend/entrypoints/rum'

/**
 * Analytics payload structure from frontend
 */
export interface AnalyticsPayload {
  metrics: PerformanceMetric[]
  session: {
    sessionId: string
    timestamp: number
    url: string
    referrer: string
    viewport: {
      width: number
      height: number
    }
  }
  metadata: Record<string, any>
}

/**
 * Aggregated performance data for reporting
 */
export interface PerformanceReport {
  timeRange: {
    start: number
    end: number
  }
  metrics: {
    [key: string]: {
      count: number
      p50: number
      p75: number
      p95: number
      p99: number
      good: number
      needsImprovement: number
      poor: number
    }
  }
  templates: {
    [template: string]: {
      count: number
      averageLCP: number
      averageFCP: number
      averageCLS: number
    }
  }
  devices: {
    mobile: number
    desktop: number
    tablet: number
  }
  connections: {
    [type: string]: number
  }
}

/**
 * Configuration for analytics endpoint
 */
export interface AnalyticsConfig {
  /** Enable/disable data collection */
  enabled: boolean
  /** Maximum payload size in bytes */
  maxPayloadSize: number
  /** Rate limiting: requests per minute */
  rateLimit: number
  /** Data retention period in days */
  retentionDays: number
  /** Database connection string */
  databaseUrl?: string
  /** External analytics services */
  externalServices: {
    googleAnalytics?: {
      measurementId: string
      apiSecret: string
    }
    datadog?: {
      apiKey: string
      site: string
    }
    newRelic?: {
      apiKey: string
      accountId: string
    }
  }
}

/**
 * Default analytics configuration
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  maxPayloadSize: 1024 * 1024, // 1MB
  rateLimit: 100, // 100 requests per minute per IP
  retentionDays: 90,
  externalServices: {}
}

/**
 * In-memory storage for demonstration (replace with actual database)
 */
class MemoryStorage {
  private metrics: PerformanceMetric[] = []
  private sessions: Map<string, any> = new Map()

  async storeMetrics(payload: AnalyticsPayload): Promise<void> {
    // Store session data
    this.sessions.set(payload.session.sessionId, payload.session)

    // Store metrics with session reference
    payload.metrics.forEach(metric => {
      this.metrics.push({
        ...metric,
        sessionData: payload.session,
        metadata: payload.metadata
      })
    })

    // Clean old data (simple cleanup for demo)
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000) // 90 days
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }

  async getMetrics(filter: {
    template?: string
    timeRange?: { start: number, end: number }
    metric?: string
  } = {}): Promise<PerformanceMetric[]> {
    let filtered = this.metrics

    if (filter.template) {
      filtered = filtered.filter(m => m.template === filter.template)
    }

    if (filter.timeRange) {
      filtered = filtered.filter(m =>
        m.timestamp >= filter.timeRange!.start &&
        m.timestamp <= filter.timeRange!.end
      )
    }

    if (filter.metric) {
      filtered = filtered.filter(m => m.name === filter.metric)
    }

    return filtered
  }

  async generateReport(timeRange: { start: number, end: number }): Promise<PerformanceReport> {
    const metrics = await this.getMetrics({ timeRange })

    const report: PerformanceReport = {
      timeRange,
      metrics: {},
      templates: {},
      devices: { mobile: 0, desktop: 0, tablet: 0 },
      connections: {}
    }

    // Group metrics by name
    const metricGroups: { [name: string]: PerformanceMetric[] } = {}
    metrics.forEach(metric => {
      if (!metricGroups[metric.name]) {
        metricGroups[metric.name] = []
      }
      metricGroups[metric.name].push(metric)
    })

    // Calculate percentiles for each metric
    Object.keys(metricGroups).forEach(metricName => {
      const values = metricGroups[metricName]
        .map(m => m.value)
        .sort((a, b) => a - b)

      const ratings = metricGroups[metricName].reduce(
        (acc, m) => {
          acc[m.rating]++
          return acc
        },
        { good: 0, 'needs-improvement': 0, poor: 0 }
      )

      report.metrics[metricName] = {
        count: values.length,
        p50: this.percentile(values, 0.5),
        p75: this.percentile(values, 0.75),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99),
        good: ratings.good,
        needsImprovement: ratings['needs-improvement'],
        poor: ratings.poor
      }
    })

    // Group by template
    const templateGroups: { [template: string]: PerformanceMetric[] } = {}
    metrics.forEach(metric => {
      if (!templateGroups[metric.template]) {
        templateGroups[metric.template] = []
      }
      templateGroups[metric.template].push(metric)
    })

    Object.keys(templateGroups).forEach(template => {
      const templateMetrics = templateGroups[template]
      const lcpMetrics = templateMetrics.filter(m => m.name === 'LCP')
      const fcpMetrics = templateMetrics.filter(m => m.name === 'FCP')
      const clsMetrics = templateMetrics.filter(m => m.name === 'CLS')

      report.templates[template] = {
        count: templateMetrics.length,
        averageLCP: lcpMetrics.length > 0 ? lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length : 0,
        averageFCP: fcpMetrics.length > 0 ? fcpMetrics.reduce((sum, m) => sum + m.value, 0) / fcpMetrics.length : 0,
        averageCLS: clsMetrics.length > 0 ? clsMetrics.reduce((sum, m) => sum + m.value, 0) / clsMetrics.length : 0
      }
    })

    // Count devices and connections
    metrics.forEach(metric => {
      // Simple device detection based on user agent
      const isMobile = /Mobile|Android|iPhone/i.test(metric.userAgent)
      const isTablet = /Tablet|iPad/i.test(metric.userAgent)

      if (isMobile && !isTablet) {
        report.devices.mobile++
      } else if (isTablet) {
        report.devices.tablet++
      } else {
        report.devices.desktop++
      }

      // Connection types
      if (metric.connectionType) {
        report.connections[metric.connectionType] = (report.connections[metric.connectionType] || 0) + 1
      }
    })

    return report
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const index = (p * (values.length - 1))
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= values.length) return values[values.length - 1]
    return values[lower] * (1 - weight) + values[upper] * weight
  }
}

/**
 * Analytics Endpoint Handler
 */
export class AnalyticsEndpoint {
  private config: AnalyticsConfig
  private storage: MemoryStorage
  private rateLimiter: Map<string, { count: number, timestamp: number }>

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.storage = new MemoryStorage()
    this.rateLimiter = new Map()
  }

  /**
   * Handle incoming analytics data
   */
  async handleRequest(request: {
    method: string
    body?: string
    headers: Record<string, string>
    ip?: string
  }): Promise<{
    status: number
    body: string
    headers: Record<string, string>
  }> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        body: '',
        headers: corsHeaders
      }
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return {
        status: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
        headers: corsHeaders
      }
    }

    // Check if analytics is enabled
    if (!this.config.enabled) {
      return {
        status: 503,
        body: JSON.stringify({ error: 'Analytics collection disabled' }),
        headers: corsHeaders
      }
    }

    // Rate limiting
    if (request.ip && !this.checkRateLimit(request.ip)) {
      return {
        status: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
        headers: corsHeaders
      }
    }

    // Validate payload size
    const bodySize = Buffer.byteLength(request.body || '', 'utf8')
    if (bodySize > this.config.maxPayloadSize) {
      return {
        status: 413,
        body: JSON.stringify({ error: 'Payload too large' }),
        headers: corsHeaders
      }
    }

    try {
      // Parse and validate payload
      const payload: AnalyticsPayload = JSON.parse(request.body || '{}')

      if (!this.validatePayload(payload)) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Invalid payload format' }),
          headers: corsHeaders
        }
      }

      // Store metrics
      await this.storeMetrics(payload)

      // Send to external services
      await this.forwardToExternalServices(payload)

      return {
        status: 200,
        body: JSON.stringify({ success: true, received: payload.metrics.length }),
        headers: corsHeaders
      }
    } catch (error) {
      console.error('Analytics endpoint error:', error)
      return {
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
        headers: corsHeaders
      }
    }
  }

  /**
   * Generate performance report
   */
  async generateReport(
    startTime: number = Date.now() - (24 * 60 * 60 * 1000),
    endTime: number = Date.now()
  ): Promise<PerformanceReport> {
    return await this.storage.generateReport({
      start: startTime,
      end: endTime
    })
  }

  /**
   * Get raw metrics data
   */
  async getMetrics(filter: {
    template?: string
    timeRange?: { start: number, end: number }
    metric?: string
  } = {}): Promise<PerformanceMetric[]> {
    return await this.storage.getMetrics(filter)
  }

  /**
   * Private methods
   */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute

    // Clean old entries
    for (const [key, data] of this.rateLimiter.entries()) {
      if (now - data.timestamp > windowMs) {
        this.rateLimiter.delete(key)
      }
    }

    // Check current IP
    const current = this.rateLimiter.get(ip)
    if (!current) {
      this.rateLimiter.set(ip, { count: 1, timestamp: now })
      return true
    }

    if (now - current.timestamp > windowMs) {
      this.rateLimiter.set(ip, { count: 1, timestamp: now })
      return true
    }

    if (current.count >= this.config.rateLimit) {
      return false
    }

    current.count++
    return true
  }

  private validatePayload(payload: any): payload is AnalyticsPayload {
    return (
      payload &&
      Array.isArray(payload.metrics) &&
      payload.session &&
      typeof payload.session.sessionId === 'string' &&
      typeof payload.session.timestamp === 'number'
    )
  }

  private async storeMetrics(payload: AnalyticsPayload): Promise<void> {
    // Validate and clean metrics
    const validMetrics = payload.metrics.filter(metric =>
      metric.name &&
      typeof metric.value === 'number' &&
      typeof metric.timestamp === 'number' &&
      ['good', 'needs-improvement', 'poor'].includes(metric.rating)
    )

    if (validMetrics.length === 0) {
      throw new Error('No valid metrics in payload')
    }

    await this.storage.storeMetrics({
      ...payload,
      metrics: validMetrics
    })
  }

  private async forwardToExternalServices(payload: AnalyticsPayload): Promise<void> {
    const promises: Promise<void>[] = []

    // Google Analytics 4 Measurement Protocol
    if (this.config.externalServices.googleAnalytics) {
      promises.push(this.sendToGoogleAnalytics(payload))
    }

    // Datadog
    if (this.config.externalServices.datadog) {
      promises.push(this.sendToDatadog(payload))
    }

    // New Relic
    if (this.config.externalServices.newRelic) {
      promises.push(this.sendToNewRelic(payload))
    }

    // Wait for all external services (but don't fail if they fail)
    await Promise.allSettled(promises)
  }

  private async sendToGoogleAnalytics(payload: AnalyticsPayload): Promise<void> {
    const config = this.config.externalServices.googleAnalytics!

    // Convert Web Vitals to GA4 events
    const events = payload.metrics.map(metric => ({
      name: 'web_vital',
      params: {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        page_location: metric.url,
        custom_map: {
          template: metric.template,
          session_id: metric.sessionId
        }
      }
    }))

    const gaPayload = {
      client_id: payload.session.sessionId,
      events
    }

    try {
      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gaPayload)
      })
    } catch (error) {
      console.error('Failed to send to Google Analytics:', error)
    }
  }

  private async sendToDatadog(payload: AnalyticsPayload): Promise<void> {
    const config = this.config.externalServices.datadog!

    const series = payload.metrics.map(metric => ({
      metric: `shopify.webvitals.${metric.name.toLowerCase()}`,
      points: [[Math.floor(metric.timestamp / 1000), metric.value]],
      tags: [
        `template:${metric.template}`,
        `rating:${metric.rating}`,
        `shop:${metric.shopDomain}`
      ]
    }))

    try {
      await fetch(`https://api.${config.site}/api/v1/series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': config.apiKey
        },
        body: JSON.stringify({ series })
      })
    } catch (error) {
      console.error('Failed to send to Datadog:', error)
    }
  }

  private async sendToNewRelic(payload: AnalyticsPayload): Promise<void> {
    const config = this.config.externalServices.newRelic!

    const events = payload.metrics.map(metric => ({
      eventType: 'WebVital',
      metricName: metric.name,
      value: metric.value,
      rating: metric.rating,
      template: metric.template,
      url: metric.url,
      sessionId: metric.sessionId,
      shop: metric.shopDomain,
      timestamp: metric.timestamp
    }))

    try {
      await fetch('https://insights-collector.newrelic.com/v1/accounts/' + config.accountId + '/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Insert-Key': config.apiKey
        },
        body: JSON.stringify(events)
      })
    } catch (error) {
      console.error('Failed to send to New Relic:', error)
    }
  }
}

/**
 * Create Express.js middleware for analytics endpoint
 */
export function createExpressMiddleware(config: Partial<AnalyticsConfig> = {}) {
  const endpoint = new AnalyticsEndpoint(config)

  return async (req: any, res: any) => {
    const request = {
      method: req.method,
      body: req.body ? JSON.stringify(req.body) : req.rawBody || '',
      headers: req.headers,
      ip: req.ip || req.connection.remoteAddress
    }

    const response = await endpoint.handleRequest(request)

    res.status(response.status)
    Object.keys(response.headers).forEach(header => {
      res.set(header, response.headers[header])
    })
    res.send(response.body)
  }
}

/**
 * Create Next.js API route handler
 */
export function createNextjsHandler(config: Partial<AnalyticsConfig> = {}) {
  const endpoint = new AnalyticsEndpoint(config)

  return async (req: any, res: any) => {
    let body = ''
    if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body)
    } else if (typeof req.body === 'string') {
      body = req.body
    }

    const request = {
      method: req.method,
      body,
      headers: req.headers,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }

    const response = await endpoint.handleRequest(request)

    res.status(response.status)
    Object.keys(response.headers).forEach(header => {
      res.setHeader(header, response.headers[header])
    })
    res.send(response.body)
  }
}

/**
 * Example configuration for production
 */
export const PRODUCTION_CONFIG: Partial<AnalyticsConfig> = {
  enabled: true,
  maxPayloadSize: 512 * 1024, // 512KB
  rateLimit: 60, // 60 requests per minute
  retentionDays: 30, // 30 days retention
  externalServices: {
    // Configure your external services here
    // googleAnalytics: {
    //   measurementId: 'G-XXXXXXXXXX',
    //   apiSecret: 'your-api-secret'
    // }
  }
}

export default AnalyticsEndpoint