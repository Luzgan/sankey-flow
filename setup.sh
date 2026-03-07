#!/bin/bash

# Sankey Tableau Extension Setup Script

echo "Setting up Sankey Tableau Extension..."

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &>/dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Building TypeScript files and copying to extensions-api directory..."
npm run build:deploy

echo "Setup complete!"
echo ""
echo "Files have been copied to: ../extensions-api/sankey-tableau-extension/"
echo ""
echo "Next steps:"
echo "1. Start the Extensions API server:"
echo "   cd ../extensions-api && npm start"
echo ""
echo "2. Register the extension in Tableau Desktop:"
echo "   - Go to Help > Settings and Performance > Manage Extensions"
echo "   - Click 'Add Extension'"
echo "   - Browse to ../extensions-api/sankey-tableau-extension/SankeyViz.trex"
echo ""
echo "3. Use the sample-data.csv file to test the extension"
