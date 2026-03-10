#!/bin/bash
# EC2 setup script for Sankey Flow extension
# Run once on the server to set up the serving directory and nginx config

set -euo pipefail

DEPLOY_DIR="/var/www/sankeyflow"
REPO_DIR="/home/ec2-user/sankey-tableau-extension"

echo "=== Creating deploy directory ==="
sudo mkdir -p "$DEPLOY_DIR/lib"
sudo chown -R ec2-user:ec2-user "$DEPLOY_DIR"

echo "=== Installing Node.js (if needed) ==="
if ! command -v node &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
fi

echo "=== Setting up nginx config ==="
sudo cp "$REPO_DIR/deploy/nginx/sankeyflow.conf" /etc/nginx/conf.d/sankeyflow.conf
sudo nginx -t
sudo systemctl reload nginx

echo "=== Getting SSL certificate ==="
if ! command -v certbot &>/dev/null; then
    sudo dnf install -y certbot python3-certbot-nginx
fi
sudo certbot --nginx -d sankeyflow.lukholc.me --non-interactive --agree-tos -m luk.holc@gmail.com

echo ""
echo "=== Done! ==="
echo "Run the deploy script or push to main to deploy."
