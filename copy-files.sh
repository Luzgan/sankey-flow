#!/bin/bash

# Copy Tableau Extension files to extensions-api directory

echo "📁 Copying extension files to extensions-api..."

# Define source and target directories
SOURCE_DIR="."
TARGET_DIR="../extensions-api/sankey-tableau-extension"

# Files to copy
FILES=("SankeyViz.html" "SankeyViz.js" "SankeyViz.js.map" "SankeyViz.js.LICENSE.txt" "SankeyViz.trex" "SankeyConfig.html" "SankeyConfig.js" "SankeyConfig.js.map" "sample-data.csv")

# Additional files to copy (optional documentation)
OPTIONAL_FILES=("README.md" "QUICK_START.md")

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "📂 Creating target directory: $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# Copy each file if it exists
for file in "${FILES[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        echo "📋 Copying $file..."
        cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    else
        echo "⚠️  File $file not found, skipping..."
    fi
done

# Copy optional files
echo "📋 Copying optional documentation files..."
for file in "${OPTIONAL_FILES[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        echo "📋 Copying $file..."
        cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    else
        echo "ℹ️  Optional file $file not found, skipping..."
    fi
done

echo "✅ Files copied to: $TARGET_DIR"
echo "📊 Files copied:"
ls -la "$TARGET_DIR"
