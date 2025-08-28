#!/bin/bash

echo "🚀 Setting up PageObjectGenerator project..."

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
yarn playwright install

# Build the project
echo "🔨 Building project..."
yarn build

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
yarn test

echo "✅ Setup complete! Your PageObjectGenerator project is ready."
echo ""
echo "You can now:"
echo "- Run tests: yarn test"
echo "- Run live tests: yarn test:live"
echo "- Build the project: yarn build"
echo "- Check code quality: yarn lint"
echo ""
echo "Happy coding! 🎉"
