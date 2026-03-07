
#!/bin/bash

echo "🔍 Checking for Tableau Public..."

# Find Tableau Public app (handle different naming conventions)
TABLEAU_APP=$(find /Applications -name "*Tableau Public*" -type d | head -1)

if [ -n "$TABLEAU_APP" ]; then
    echo "✅ Tableau Public found: $(basename "$TABLEAU_APP")"
    
    # Get version
    VERSION=$(defaults read "$TABLEAU_APP/Contents/Info" CFBundleShortVersionString 2>/dev/null)
    if [ -n "$VERSION" ]; then
        echo "📋 Version: $VERSION"
    else
        echo "⚠️  Could not determine version"
    fi
    
    echo "🚀 Starting Tableau Public with remote debugging..."
    open "$TABLEAU_APP" --args --remote-debugging-port=8696
    
    echo "🌐 Remote debugging available at: http://localhost:8696"
    echo "💡 You can now debug your extension using Chrome DevTools"
    
else
    echo "❌ Tableau Public not found in /Applications/"
    echo "📝 Please ensure Tableau Public is installed in the Applications folder"
    echo "🔗 Download from: https://public.tableau.com/en-us/s/"
fi