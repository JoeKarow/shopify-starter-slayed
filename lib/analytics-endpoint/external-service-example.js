/**
 * External Analytics Service Example
 * T078: Configure RUM data reporting to analytics endpoint
 *
 * This example shows how to set up an external service (e.g., Vercel Edge Function,
 * Netlify Function, or Cloudflare Worker) to handle RUM data from Shopify themes.
 */

// Example: Vercel Edge Function
export default async function handler(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders
    })
  }

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    // Parse the analytics payload
    const payload = await request.json()

    // Validate payload structure
    if (!payload.metrics || !Array.isArray(payload.metrics)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Process metrics - example integrations
    await Promise.allSettled([
      sendToGoogleAnalytics(payload),
      sendToDatadog(payload),
      storeInDatabase(payload)
    ])

    return new Response(JSON.stringify({
      success: true,
      received: payload.metrics.length
    }), {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Analytics processing error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// Send metrics to Google Analytics 4
async function sendToGoogleAnalytics(payload) {
  const measurementId = process.env.GA_MEASUREMENT_ID
  const apiSecret = process.env.GA_API_SECRET

  if (!measurementId || !apiSecret) return

  const events = payload.metrics
    .filter(metric => ['LCP', 'FCP', 'CLS', 'FID', 'INP'].includes(metric.name))
    .map(metric => ({
      name: 'web_vital',
      params: {
        metric_name: metric.name,
        metric_value: Math.round(metric.value),
        metric_rating: metric.rating,
        page_location: metric.url,
        page_title: payload.metadata?.page?.title || '',
        custom_map: {
          template: metric.template,
          shop: metric.shopDomain,
          session_id: metric.sessionId
        }
      }
    }))

  if (events.length === 0) return

  const gaPayload = {
    client_id: payload.session.sessionId,
    events
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gaPayload)
      }
    )

    if (!response.ok) {
      console.error('GA4 send failed:', response.status, await response.text())
    }
  } catch (error) {
    console.error('GA4 send error:', error)
  }
}

// Send metrics to Datadog
async function sendToDatadog(payload) {
  const apiKey = process.env.DATADOG_API_KEY
  const site = process.env.DATADOG_SITE || 'datadoghq.com'

  if (!apiKey) return

  const series = payload.metrics.map(metric => ({
    metric: `shopify.webvitals.${metric.name.toLowerCase()}`,
    points: [[Math.floor(metric.timestamp / 1000), metric.value]],
    tags: [
      `template:${metric.template}`,
      `rating:${metric.rating}`,
      `shop:${metric.shopDomain}`,
      `version:${metric.version}`,
      `connection:${metric.connectionType || 'unknown'}`
    ]
  }))

  try {
    const response = await fetch(`https://api.${site}/api/v1/series`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': apiKey
      },
      body: JSON.stringify({ series })
    })

    if (!response.ok) {
      console.error('Datadog send failed:', response.status, await response.text())
    }
  } catch (error) {
    console.error('Datadog send error:', error)
  }
}

// Store in database (example with Supabase)
async function storeInDatabase(payload) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return

  // Prepare data for database storage
  const records = payload.metrics.map(metric => ({
    session_id: metric.sessionId,
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating,
    timestamp: new Date(metric.timestamp).toISOString(),
    url: metric.url,
    template: metric.template,
    shop_domain: metric.shopDomain,
    user_agent: metric.userAgent,
    connection_type: metric.connectionType,
    device_memory: metric.deviceMemory,
    viewport_width: payload.session.viewport.width,
    viewport_height: payload.session.viewport.height,
    metadata: JSON.stringify(payload.metadata)
  }))

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/performance_metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(records)
    })

    if (!response.ok) {
      console.error('Database store failed:', response.status, await response.text())
    }
  } catch (error) {
    console.error('Database store error:', error)
  }
}

// Export config for different platforms

// Vercel Edge Function config
export const config = {
  runtime: 'edge'
}

// Netlify Function example
/*
exports.handler = async (event, context) => {
  const request = {
    method: event.httpMethod,
    json: () => JSON.parse(event.body || '{}')
  }

  const response = await handler(request)

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  }
}
*/

// Cloudflare Worker example
/*
addEventListener('fetch', event => {
  event.respondWith(handler(event.request))
})
*/

// Database schema example (SQL)
/*
CREATE TABLE performance_metrics (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_rating VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT NOT NULL,
  template VARCHAR(100),
  shop_domain VARCHAR(255),
  user_agent TEXT,
  connection_type VARCHAR(50),
  device_memory INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_template ON performance_metrics(template);
CREATE INDEX idx_performance_metrics_shop ON performance_metrics(shop_domain);
CREATE INDEX idx_performance_metrics_session ON performance_metrics(session_id);
*/