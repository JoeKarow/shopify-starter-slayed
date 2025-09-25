#!/bin/bash

# Bootstrap script for Shopify Template Codesplitting development environment
# This script sets up the complete development environment with mise, dependencies, and tools

set -e  # Exit on any error

echo "🚀 Shopify Template Codesplitting - Environment Bootstrap"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if mise is installed
check_mise() {
    print_info "Checking for mise installation..."

    if command -v mise >/dev/null 2>&1; then
        print_status "mise is already installed ($(mise --version))"
        return 0
    else
        print_warning "mise not found. Installing mise..."
        return 1
    fi
}

# Install mise
install_mise() {
    print_info "Installing mise (dev tool version manager)..."

    # Install mise using the official installer
    if command -v curl >/dev/null 2>&1; then
        curl https://mise.run | sh
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- https://mise.run | sh
    else
        print_error "Neither curl nor wget found. Please install mise manually: https://mise.jdx.dev"
        exit 1
    fi

    # Add mise to PATH for current session
    export PATH="$HOME/.local/bin:$PATH"

    if command -v mise >/dev/null 2>&1; then
        print_status "mise installed successfully"
    else
        print_error "mise installation failed"
        exit 1
    fi
}

# Install development tools
install_tools() {
    print_info "Installing development tools (Node.js, Bun)..."

    # Install tools defined in mise.toml
    mise install

    print_status "Development tools installed"
}

# Install project dependencies
install_dependencies() {
    print_info "Installing project dependencies..."

    # Use bun for faster installation
    if command -v bun >/dev/null 2>&1; then
        bun install
        print_status "Dependencies installed with Bun"
    elif command -v npm >/dev/null 2>&1; then
        npm install
        print_status "Dependencies installed with npm"
    else
        print_error "No package manager found (bun/npm)"
        exit 1
    fi
}

# Setup Shopify CLI
setup_shopify_cli() {
    print_info "Setting up Shopify CLI..."

    if command -v shopify >/dev/null 2>&1; then
        print_status "Shopify CLI already installed"
    else
        print_warning "Shopify CLI not found. Please install it manually:"
        echo "  - macOS: brew install shopify-cli"
        echo "  - Other: https://shopify.dev/docs/api/shopify-cli#installation"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating project directories..."

    # Ensure all necessary directories exist
    mkdir -p frontend/entrypoints/splits
    mkdir -p frontend/components
    mkdir -p frontend/decorators
    mkdir -p dist/reports
    mkdir -p assets

    print_status "Project directories created"
}

# Setup Git hooks
setup_git_hooks() {
    print_info "Setting up Git hooks for performance validation..."

    # Create git hooks directory if it doesn't exist
    mkdir -p .git/hooks

    # Create pre-push hook for performance budget validation
    cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
echo "🔍 Running performance budget check before push..."

# Check if mise is available
if command -v mise >/dev/null 2>&1; then
    # Run performance budget check
    mise run budgets:check

    # If performance check fails, prevent push
    if [ $? -ne 0 ]; then
        echo "❌ Performance budget check failed. Fix issues before pushing."
        exit 1
    fi
else
    echo "⚠️  mise not found. Skipping performance validation."
fi

echo "✅ Performance validation passed"
EOF

    # Make the hook executable
    chmod +x .git/hooks/pre-push

    print_status "Git hooks configured"
}

# Validate environment
validate_environment() {
    print_info "Validating development environment..."

    # Check essential tools
    local tools_ok=true

    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js not found"
        tools_ok=false
    fi

    if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
        print_error "No package manager found (bun/npm)"
        tools_ok=false
    fi

    if ! command -v git >/dev/null 2>&1; then
        print_error "Git not found"
        tools_ok=false
    fi

    if [ "$tools_ok" = true ]; then
        print_status "Environment validation passed"
    else
        print_error "Environment validation failed"
        exit 1
    fi
}

# Main bootstrap process
main() {
    echo "Starting bootstrap process..."
    echo ""

    # Step 1: Check/install mise
    if ! check_mise; then
        install_mise
    fi

    # Step 2: Install development tools
    install_tools

    # Step 3: Create directories
    create_directories

    # Step 4: Install dependencies
    install_dependencies

    # Step 5: Setup Shopify CLI
    setup_shopify_cli

    # Step 6: Setup Git hooks
    setup_git_hooks

    # Step 7: Validate environment
    validate_environment

    echo ""
    print_status "Bootstrap completed successfully!"
    echo ""
    echo "🎉 Development environment is ready!"
    echo ""
    echo "Available commands:"
    echo "  mise run dev:performance  - Start dev server with performance monitoring"
    echo "  mise run performance      - Full performance analysis and budget checks"
    echo "  mise run budgets:check    - Quick performance budget validation"
    echo "  npm run dev              - Standard development server"
    echo "  npm run build            - Production build"
    echo "  npm run test             - Run tests"
    echo ""
    echo "Next steps:"
    echo "1. Configure your Shopify store connection:"
    echo "   shopify theme dev"
    echo "2. Start development:"
    echo "   mise run dev:performance"
    echo ""
    echo "For more information, see CLAUDE.md"
}

# Run main function
main "$@"