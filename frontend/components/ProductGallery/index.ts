/**
 * ProductGallery Component
 *
 * A lazy-loaded product gallery component that only loads on product templates.
 * Features image zoom, thumbnail navigation, and responsive design.
 *
 * Uses @Template decorator to load only on product pages for better performance.
 * Uses @LazyLoad decorator to defer loading until the component is near viewport.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { Template, LazyLoad } from '@lib/shopify-decorator-system/index.js'

export interface ProductGalleryOptions {
  productId?: string
  imageSelector?: string
  thumbnailSelector?: string
  zoomEnabled?: boolean
  autoPlay?: boolean
  transitionDuration?: number
}

/**
 * Product Gallery Component
 *
 * Handles product image display with zoom functionality, thumbnail navigation,
 * and touch/swipe support for mobile devices.
 */
@Template(['product'])
@LazyLoad({
  rootMargin: '200px',  // Start loading when 200px from viewport
  threshold: 0.1        // Load when 10% visible
})
export class ProductGallery {
  private container: HTMLElement | null = null
  private mainImage: HTMLImageElement | null = null
  private thumbnails: NodeListOf<HTMLElement> | null = null
  private currentImageIndex: number = 0
  private images: string[] = []
  private options: ProductGalleryOptions
  private touchStartX: number = 0
  private touchEndX: number = 0
  private isZoomed: boolean = false
  private zoomLevel: number = 2

  constructor(options: ProductGalleryOptions = {}) {
    this.options = {
      imageSelector: '.product-gallery-main img',
      thumbnailSelector: '.gallery-thumbnail',
      zoomEnabled: true,
      autoPlay: false,
      transitionDuration: 300,
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
   * Initialize the product gallery
   */
  private init(): void {
    this.findElements()
    this.loadImages()
    this.bindEvents()
    this.setupAccessibility()

    // Emit custom event for other components
    this.dispatchEvent('productGallery:initialized', {
      imageCount: this.images.length,
      zoomEnabled: this.options.zoomEnabled
    })
  }

  /**
   * Find and cache DOM elements
   */
  private findElements(): void {
    this.container = document.querySelector('.product-gallery')
    this.mainImage = document.querySelector(this.options.imageSelector || '.product-gallery-main img')
    this.thumbnails = document.querySelectorAll(this.options.thumbnailSelector || '.gallery-thumbnail')

    if (!this.container || !this.mainImage) {
      console.warn('ProductGallery: Required elements not found')
      return
    }
  }

  /**
   * Load and cache image URLs
   */
  private loadImages(): void {
    if (!this.thumbnails) return

    this.images = Array.from(this.thumbnails).map(thumbnail => {
      const img = thumbnail.querySelector('img')
      return img?.getAttribute('data-full-src') || img?.src || ''
    }).filter(src => src.length > 0)
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.container || !this.mainImage) return

    // Thumbnail clicks
    this.thumbnails?.forEach((thumbnail, index) => {
      thumbnail.addEventListener('click', (e) => {
        e.preventDefault()
        this.selectImage(index)
      })

      // Keyboard navigation for thumbnails
      thumbnail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          this.selectImage(index)
        }
      })
    })

    // Main image interactions
    if (this.options.zoomEnabled) {
      this.mainImage.addEventListener('click', () => this.toggleZoom())
      this.mainImage.addEventListener('mousemove', (e) => this.handleMouseMove(e))
      this.mainImage.addEventListener('mouseleave', () => this.resetZoom())
    }

    // Touch events for mobile swipe
    this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true })
    this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true })

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e))

    // Window resize
    window.addEventListener('resize', () => this.handleResize())
  }

  /**
   * Setup accessibility attributes
   */
  private setupAccessibility(): void {
    if (!this.mainImage || !this.thumbnails) return

    // Main image
    this.mainImage.setAttribute('role', 'img')
    this.mainImage.setAttribute('aria-label', 'Product main image')

    // Thumbnails
    this.thumbnails.forEach((thumbnail, index) => {
      thumbnail.setAttribute('role', 'button')
      thumbnail.setAttribute('tabindex', '0')
      thumbnail.setAttribute('aria-label', `View image ${index + 1} of ${this.images.length}`)

      if (index === 0) {
        thumbnail.classList.add('active')
        thumbnail.setAttribute('aria-selected', 'true')
      }
    })
  }

  /**
   * Select and display an image
   */
  private selectImage(index: number): void {
    if (index < 0 || index >= this.images.length || !this.mainImage) return

    // Update current index
    this.currentImageIndex = index

    // Update main image with fade transition
    this.mainImage.style.opacity = '0'

    setTimeout(() => {
      if (this.mainImage) {
        this.mainImage.src = this.images[index]
        this.mainImage.style.opacity = '1'
      }
    }, this.options.transitionDuration || 300 / 2)

    // Update thumbnails
    this.updateThumbnailStates(index)

    // Emit change event
    this.dispatchEvent('productGallery:imageChanged', {
      index,
      src: this.images[index]
    })
  }

  /**
   * Update thumbnail active states
   */
  private updateThumbnailStates(activeIndex: number): void {
    this.thumbnails?.forEach((thumbnail, index) => {
      thumbnail.classList.toggle('active', index === activeIndex)
      thumbnail.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false')
    })
  }

  /**
   * Toggle zoom mode
   */
  private toggleZoom(): void {
    if (!this.options.zoomEnabled) return

    this.isZoomed = !this.isZoomed
    this.applyZoom()
  }

  /**
   * Apply zoom transformation
   */
  private applyZoom(): void {
    if (!this.mainImage) return

    if (this.isZoomed) {
      this.mainImage.style.transform = `scale(${this.zoomLevel})`
      this.mainImage.style.cursor = 'zoom-out'
      this.container?.classList.add('zoomed')
    } else {
      this.mainImage.style.transform = 'scale(1)'
      this.mainImage.style.cursor = 'zoom-in'
      this.container?.classList.remove('zoomed')
    }
  }

  /**
   * Handle mouse movement for zoom positioning
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isZoomed || !this.mainImage) return

    const rect = this.mainImage.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    const xPercent = x * 100
    const yPercent = y * 100

    this.mainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`
  }

  /**
   * Reset zoom state
   */
  private resetZoom(): void {
    if (this.isZoomed) {
      this.isZoomed = false
      this.applyZoom()
    }
  }

  /**
   * Handle touch start for swipe detection
   */
  private handleTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].screenX
  }

  /**
   * Handle touch end for swipe detection
   */
  private handleTouchEnd(e: TouchEvent): void {
    this.touchEndX = e.changedTouches[0].screenX
    this.handleSwipe()
  }

  /**
   * Handle swipe gestures
   */
  private handleSwipe(): void {
    const swipeThreshold = 50
    const diff = this.touchStartX - this.touchEndX

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next image
        this.nextImage()
      } else {
        // Swipe right - previous image
        this.previousImage()
      }
    }
  }

  /**
   * Show next image
   */
  public nextImage(): void {
    const nextIndex = (this.currentImageIndex + 1) % this.images.length
    this.selectImage(nextIndex)
  }

  /**
   * Show previous image
   */
  public previousImage(): void {
    const prevIndex = this.currentImageIndex === 0
      ? this.images.length - 1
      : this.currentImageIndex - 1
    this.selectImage(prevIndex)
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    // Only handle keys when gallery is focused or active
    if (!this.container?.contains(document.activeElement)) return

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        this.previousImage()
        break
      case 'ArrowRight':
        e.preventDefault()
        this.nextImage()
        break
      case 'Escape':
        this.resetZoom()
        break
      case ' ':
        if (this.options.zoomEnabled) {
          e.preventDefault()
          this.toggleZoom()
        }
        break
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    // Reset zoom on resize to prevent layout issues
    this.resetZoom()
  }

  /**
   * Get current image information
   */
  public getCurrentImage(): { index: number; src: string } {
    return {
      index: this.currentImageIndex,
      src: this.images[this.currentImageIndex] || ''
    }
  }

  /**
   * Get total number of images
   */
  public getImageCount(): number {
    return this.images.length
  }

  /**
   * Programmatically go to specific image
   */
  public goToImage(index: number): void {
    this.selectImage(index)
  }

  /**
   * Enable or disable zoom
   */
  public setZoomEnabled(enabled: boolean): void {
    this.options.zoomEnabled = enabled
    if (!enabled) {
      this.resetZoom()
    }
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
    this.container?.dispatchEvent(event)
  }

  /**
   * Clean up event listeners (called automatically by decorator system)
   */
  public destroy(): void {
    // Remove global event listeners
    document.removeEventListener('keydown', (e) => this.handleKeydown(e))
    window.removeEventListener('resize', () => this.handleResize())

    // Emit destroy event
    this.dispatchEvent('productGallery:destroyed', {
      componentId: this.options.productId
    })
  }
}