#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Sankey Extension — Tableau Dev Mode ==="
echo ""

# 1. Ensure Tableau Extensions lib is available
TABLEAU_LIB="$SCRIPT_DIR/tableau-extensions.min.js"
if [ ! -f "$TABLEAU_LIB" ]; then
    echo "[0/4] Downloading Tableau Extensions API library..."
    # Try local extensions-api repo first, then GitHub
    LOCAL_LIB="$PROJECT_DIR/../extensions-api/lib/tableau.extensions.1.latest.min.js"
    if [ -f "$LOCAL_LIB" ]; then
        cp "$LOCAL_LIB" "$TABLEAU_LIB"
        echo "       Copied from local extensions-api"
    else
        curl -fsSL "https://tableau.github.io/extensions-api/lib/tableau.extensions.1.latest.min.js" -o "$TABLEAU_LIB"
        echo "       Downloaded from Tableau GitHub"
    fi
fi

# 1. Build
echo "[1/4] Building extension..."
npm run build:dev --silent

# 2. Check if server is already running on 8765
if curl -s http://localhost:8765 > /dev/null 2>&1; then
    echo "[2/4] Dev server already running on port 8765"
else
    echo "[2/4] Starting dev server (Tableau mode) on port 8765..."
    node dev/server.mjs --tableau &
    SERVER_PID=$!
    sleep 1

    # Verify it started
    if ! curl -s http://localhost:8765 > /dev/null 2>&1; then
        echo "ERROR: Server failed to start"
        exit 1
    fi
    echo "       Server PID: $SERVER_PID"
fi

# 3. Launch Tableau Public with debug port
TABLEAU_APP=$(find /Applications -maxdepth 1 -name "*Tableau Public*" -type d 2>/dev/null | head -1)

if [ -z "$TABLEAU_APP" ]; then
    echo "[3/4] SKIP: Tableau Public not found in /Applications"
    echo "       Install from: https://public.tableau.com"
else
    # Check if Tableau is already running
    if pgrep -f "Tableau" > /dev/null 2>&1; then
        echo "[3/4] Tableau is already running"
    else
        echo "[3/4] Starting Tableau Public with remote debugging (port 8696)..."
        open "$TABLEAU_APP" --args --remote-debugging-port=8696
    fi
fi

# 4. Summary
echo "[4/4] Ready!"
echo ""
echo "  Extension server:  http://localhost:8765"
echo "  Debug (DevTools):  http://localhost:8696"
echo ""
echo "  === First-time setup (one time only) ==="
echo "  1. In Tableau: connect to data source (use sample-data.csv in project root)"
echo "  2. Create a worksheet"
echo "  3. In Marks card dropdown, select 'Extension'"
echo "  4. Choose 'Add from local file' and select SankeyViz.trex"
echo "  5. Drag Source, Category, Target to the Level shelf"
echo "  6. Drag Value to the Edge shelf"
echo "  7. Save the workbook — next time just open it"
echo ""
echo "  === Subsequent runs ==="
echo "  Just open your saved workbook. The server is already serving the latest build."
echo ""

# Keep script alive if we started the server
if [ -n "$SERVER_PID" ]; then
    echo "  Press Ctrl+C to stop the server."
    wait $SERVER_PID
fi
