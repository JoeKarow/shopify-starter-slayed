/**
 * Component Auto-Discovery System
 *
 * Uses Vite glob imports to automatically discover and register decorated components
 */

import type { ComponentMetadata } from './registry.js'

/**
 * Auto-discover all decorated components using Vite glob imports
 */
export async function discoverComponents(pattern = '/frontend/components/**/*.ts'): Promise<ComponentMetadata[]> {
  const components: ComponentMetadata[] = []

  try {
    // Use Vite's glob import feature to dynamically import all component files
    const modules = import.meta.glob('/frontend/components/**/*.{ts,js}', {
      eager: false,
      import: 'default'
    })

    // Import each module and extract component metadata
    for (const [path, importFn] of Object.entries(modules)) {
      try {
        const moduleDefault = await importFn()
        const metadata = extractComponentMetadata(moduleDefault, path)

        if (metadata) {
          components.push(metadata)
        }
      } catch (error) {
        console.warn(`Failed to import component from ${path}:`, error)
      }
    }

    // Also check for components in lib directory
    const libModules = import.meta.glob('/lib/**/*.{ts,js}', {
      eager: false,
      import: 'default'
    })

    for (const [path, importFn] of Object.entries(libModules)) {
      // Skip non-component files
      if (!path.includes('component') && !path.includes('Component')) {
        continue
      }

      try {
        const moduleDefault = await importFn()
        const metadata = extractComponentMetadata(moduleDefault, path)

        if (metadata) {
          components.push(metadata)
        }
      } catch (error) {
        console.warn(`Failed to import component from ${path}:`, error)
      }
    }
  } catch (error) {
    console.error('Component discovery failed:', error)
  }

  return components
}

/**
 * Extract component metadata from a module's default export
 */
function extractComponentMetadata(moduleDefault: any, filePath: string): ComponentMetadata | null {
  // Check if the default export is a class constructor
  if (typeof moduleDefault !== 'function' || !moduleDefault.prototype) {
    return null
  }

  const constructor = moduleDefault

  // Check if the class has Shopify decorator metadata
  const decorators = Reflect.getMetadata?.('shopify:decorators', constructor)
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return null
  }

  // Create component metadata
  const metadata: ComponentMetadata = {
    className: constructor.name,
    filePath: cleanFilePath(filePath),
    decorators: decorators,
    instance: undefined // Will be created when needed
  }

  return metadata
}

/**
 * Clean up file path for better debugging
 */
function cleanFilePath(path: string): string {
  // Remove leading slash and make relative to project root
  return path.replace(/^\/+/, '')
}

/**
 * Discover components in a specific directory
 */
export async function discoverComponentsInDir(directory: string): Promise<ComponentMetadata[]> {
  const pattern = `/${directory}/**/*.{ts,js}`

  try {
    // Create dynamic glob pattern
    const modules = import.meta.glob(pattern, {
      eager: false,
      import: 'default'
    })

    const components: ComponentMetadata[] = []

    for (const [path, importFn] of Object.entries(modules)) {
      try {
        const moduleDefault = await importFn()
        const metadata = extractComponentMetadata(moduleDefault, path)

        if (metadata) {
          components.push(metadata)
        }
      } catch (error) {
        console.warn(`Failed to import component from ${path}:`, error)
      }
    }

    return components
  } catch (error) {
    console.error(`Failed to discover components in ${directory}:`, error)
    return []
  }
}

/**
 * Discover and register all components with the registry
 */
export async function discoverAndRegister(): Promise<ComponentMetadata[]> {
  const { ComponentRegistry } = await import('./registry.js')
  const registry = ComponentRegistry.getInstance()

  const components = await discoverComponents()

  // Register each discovered component
  for (const component of components) {
    // Create instance if not already created
    if (!component.instance) {
      try {
        // Find the constructor by name in the global scope or module
        const constructor = await findConstructorByName(component.className, component.filePath)
        if (constructor) {
          component.instance = new constructor()
        }
      } catch (error) {
        console.warn(`Failed to create instance for ${component.className}:`, error)
      }
    }

    registry.register(component)
  }

  return components
}

/**
 * Find constructor by name and file path
 */
async function findConstructorByName(className: string, filePath: string): Promise<any> {
  try {
    // Try to re-import the module and find the constructor
    const module = await import(`/${filePath}`)

    // Check default export
    if (module.default && module.default.name === className) {
      return module.default
    }

    // Check named exports
    if (module[className]) {
      return module[className]
    }

    // Check all exports for matching class name
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === 'function' && value.name === className) {
        return value
      }
    }

    return null
  } catch (error) {
    console.warn(`Could not find constructor ${className} in ${filePath}:`, error)
    return null
  }
}

/**
 * Watch for new components during development
 */
export function watchForComponents(callback: (components: ComponentMetadata[]) => void): void {
  if (import.meta.hot) {
    // In development mode, watch for HMR updates
    import.meta.hot.on('vite:afterUpdate', async () => {
      const components = await discoverComponents()
      callback(components)
    })
  }
}