#!/bin/bash
# Deploy script — called by GitHub Actions or manually
# Builds and copies static files to the nginx serving directory

set -euo pipefail

REPO_DIR="/home/ec2-user/sankey-tableau-extension"
DEPLOY_DIR="/var/www/sankeyflow"

cd "$REPO_DIR"

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Installing dependencies ==="
npm ci --production=false

echo "=== Building ==="
npm run build

echo "=== Deploying static files ==="
cp SankeyViz.html SankeyViz.js SankeyViz.trex "$DEPLOY_DIR/"
cp -r legal "$DEPLOY_DIR/"

# Tableau Extensions API library — required for network-enabled mode
mkdir -p "$DEPLOY_DIR/lib"
cp lib/tableau.extensions.1.latest.min.js "$DEPLOY_DIR/lib/"

echo "=== Updating nginx config ==="
sudo cp "$REPO_DIR/deploy/nginx/sankeyflow.conf" /etc/nginx/conf.d/sankeyflow.conf
sudo nginx -t && sudo systemctl reload nginx

echo "=== Done! Files deployed to $DEPLOY_DIR ==="
