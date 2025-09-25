/**
 * Money Formatter Utility
 *
 * A money formatting utility migrated from Alpine.js magic property to TypeScript.
 * Handles various currency formats including international formats with different
 * decimal and thousand separators.
 *
 * Uses @GlobalTemplate decorator to be available on all templates.
 * Uses @Critical decorator for immediate availability for price display.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { GlobalTemplate, Critical } from '@lib/shopify-decorator-system/index.js'

export interface MoneyFormatterOptions {
  defaultFormat?: string
  defaultPrecision?: number
  thousandsSeparator?: string
  decimalSeparator?: string
  currencySymbol?: string
}

export type MoneyFormat =
  | 'amount'
  | 'amount_no_decimals'
  | 'amount_with_comma_separator'
  | 'amount_no_decimals_with_comma_separator'
  | 'amount_with_space_separator'
  | 'amount_no_decimals_with_space_separator'

/**
 * Money Formatter Component
 *
 * Provides currency formatting utilities for Shopify themes.
 * Handles cents-based amounts and various international formats.
 */
@GlobalTemplate()
@Critical()
export class MoneyFormatter {
  private options: MoneyFormatterOptions

  constructor(options: MoneyFormatterOptions = {}) {
    this.options = {
      defaultFormat: '${{amount}}',
      defaultPrecision: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      currencySymbol: '$',
      ...options
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  /**
   * Initialize the money formatter
   */
  public init(): void {
    // Register global formatting function
    if (typeof window !== 'undefined') {
      (window as any).formatMoney = this.formatMoney.bind(this)
    }

    // Emit custom event for other components
    this.dispatchEvent('moneyFormatter:initialized', {
      options: this.options
    })

    console.log('Slayed Money Formatter Initialized.')
  }

  /**
   * Format money amount (main formatting function)
   *
   * @param cents - Amount in cents (number or string)
   * @param format - Format string or predefined format name
   * @returns Formatted money string
   */
  public formatMoney(cents: number | string, format?: string | MoneyFormat): string {
    // Handle string input
    if (typeof cents === 'string') {
      cents = cents.replace('.', '')
      cents = parseInt(cents, 10)
    }

    // Handle invalid input
    if (isNaN(cents) || cents == null) {
      return this.formatWithDelimiters(0, 2)
    }

    // Default format
    let formatString = format || this.options.defaultFormat || '${{amount}}'

    // Handle predefined format shortcuts
    if (format && !formatString.includes('{{')) {
      formatString = this.getFormatString(format as MoneyFormat)
    }

    // Extract placeholder from format string
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/
    const match = formatString.match(placeholderRegex)

    if (!match || !match[1]) {
      console.warn('MoneyFormatter: Invalid format string', formatString)
      return this.formatWithDelimiters(cents, 2)
    }

    const placeholder = match[1]
    let value = ''

    // Format based on placeholder type
    switch (placeholder) {
      case 'amount':
        value = this.formatWithDelimiters(cents, 2)
        break
      case 'amount_no_decimals':
        value = this.formatWithDelimiters(cents, 0)
        break
      case 'amount_with_comma_separator':
        value = this.formatWithDelimiters(cents, 2, '.', ',')
        break
      case 'amount_no_decimals_with_comma_separator':
        value = this.formatWithDelimiters(cents, 0, '.', ',')
        break
      case 'amount_with_space_separator':
        value = this.formatWithDelimiters(cents, 2, ' ', '.')
        break
      case 'amount_no_decimals_with_space_separator':
        value = this.formatWithDelimiters(cents, 0, ' ', '.')
        break
      default:
        console.warn('MoneyFormatter: Unknown placeholder', placeholder)
        value = this.formatWithDelimiters(cents, 2)
    }

    return formatString.replace(placeholderRegex, value)
  }

  /**
   * Format number with delimiters
   *
   * @param number - Amount in cents
   * @param precision - Number of decimal places
   * @param thousands - Thousands separator
   * @param decimal - Decimal separator
   * @returns Formatted number string
   */
  public formatWithDelimiters(
    number: number,
    precision?: number,
    thousands?: string,
    decimal?: string
  ): string {
    precision = this.defaultOption(precision, this.options.defaultPrecision || 2)
    thousands = this.defaultOption(thousands, this.options.thousandsSeparator || ',')
    decimal = this.defaultOption(decimal, this.options.decimalSeparator || '.')

    if (isNaN(number) || number == null) {
      return '0'
    }

    // Convert cents to dollars and fix precision
    const amount = (number / 100.0).toFixed(precision)
    const parts = amount.split('.')
    const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`)
    const cents = parts[1] ? (decimal + parts[1]) : ''

    return dollars + cents
  }

  /**
   * Get format string for predefined formats
   */
  private getFormatString(format: MoneyFormat): string {
    const symbol = this.options.currencySymbol || '$'

    const formatMap: Record<MoneyFormat, string> = {
      'amount': `${symbol}{{amount}}`,
      'amount_no_decimals': `${symbol}{{amount_no_decimals}}`,
      'amount_with_comma_separator': `${symbol}{{amount_with_comma_separator}}`,
      'amount_no_decimals_with_comma_separator': `${symbol}{{amount_no_decimals_with_comma_separator}}`,
      'amount_with_space_separator': `${symbol}{{amount_with_space_separator}}`,
      'amount_no_decimals_with_space_separator': `${symbol}{{amount_no_decimals_with_space_separator}}`
    }

    return formatMap[format] || `${symbol}{{amount}}`
  }

  /**
   * Helper function for default options
   */
  private defaultOption<T>(option: T | undefined, defaultValue: T): T {
    return typeof option === 'undefined' ? defaultValue : option
  }

  /**
   * Format price range (e.g., "$10.00 - $20.00")
   */
  public formatPriceRange(
    minPrice: number | string,
    maxPrice: number | string,
    format?: string | MoneyFormat,
    separator: string = ' - '
  ): string {
    const min = this.formatMoney(minPrice, format)
    const max = this.formatMoney(maxPrice, format)

    return min === max ? min : `${min}${separator}${max}`
  }

  /**
   * Format discount amount
   */
  public formatDiscount(
    originalPrice: number | string,
    salePrice: number | string,
    format?: string | MoneyFormat,
    showPercentage: boolean = false
  ): { original: string; sale: string; savings: string; percentage?: number } {
    const original = this.formatMoney(originalPrice, format)
    const sale = this.formatMoney(salePrice, format)

    const originalCents = typeof originalPrice === 'string' ? parseInt(originalPrice.replace('.', ''), 10) : originalPrice
    const saleCents = typeof salePrice === 'string' ? parseInt(salePrice.replace('.', ''), 10) : salePrice

    const savingsAmount = originalCents - saleCents
    const savings = this.formatMoney(savingsAmount, format)

    const result: any = { original, sale, savings }

    if (showPercentage && originalCents > 0) {
      result.percentage = Math.round((savingsAmount / originalCents) * 100)
    }

    return result
  }

  /**
   * Parse money string back to cents
   */
  public parseMoney(moneyString: string): number {
    // Remove currency symbols and format characters
    const cleanString = moneyString
      .replace(/[$€£¥₹₽]/g, '')  // Remove common currency symbols
      .replace(/[,.\s]/g, '')    // Remove separators and spaces
      .trim()

    const amount = parseInt(cleanString, 10)
    return isNaN(amount) ? 0 : amount
  }

  /**
   * Check if amount represents a sale price
   */
  public isSalePrice(originalPrice: number | string, salePrice: number | string): boolean {
    const original = typeof originalPrice === 'string' ? parseInt(originalPrice.replace('.', ''), 10) : originalPrice
    const sale = typeof salePrice === 'string' ? parseInt(salePrice.replace('.', ''), 10) : salePrice

    return sale < original && sale > 0
  }

  /**
   * Format money for specific locale
   */
  public formatForLocale(
    cents: number | string,
    locale: string = 'en-US',
    currency: string = 'USD'
  ): string {
    const amount = typeof cents === 'string' ? parseInt(cents.replace('.', ''), 10) : cents
    const dollars = amount / 100

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(dollars)
    } catch (error) {
      console.warn('MoneyFormatter: Intl.NumberFormat failed, falling back to default format', error)
      return this.formatMoney(cents)
    }
  }

  /**
   * Update formatter options
   */
  public updateOptions(newOptions: Partial<MoneyFormatterOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)
  }

  /**
   * Clean up (called automatically by decorator system)
   */
  public destroy(): void {
    // Clean up global reference
    if (typeof window !== 'undefined' && (window as any).formatMoney) {
      delete (window as any).formatMoney
    }

    // Emit destroy event
    this.dispatchEvent('moneyFormatter:destroyed', {})
  }
}

/**
 * Alpine.js Magic Property Factory (for backward compatibility)
 *
 * This maintains compatibility with existing Alpine.js markup that uses:
 * $money(cents, format)
 */
export function createAlpineMoney() {
  const formatter = new MoneyFormatter()

  return (cents: number | string, format?: string) => {
    return formatter.formatMoney(cents, format)
  }
}

// Register with Alpine.js if available
if (typeof window !== 'undefined' && (window as any).Alpine) {
  document.addEventListener('alpine:init', () => {
    (window as any).Alpine.magic('money', () => createAlpineMoney())
  })
}

// Create global instance
export const moneyFormatter = new MoneyFormatter()

// Export default formatter function for easy use
export const formatMoney = (cents: number | string, format?: string | MoneyFormat) => {
  return moneyFormatter.formatMoney(cents, format)
}