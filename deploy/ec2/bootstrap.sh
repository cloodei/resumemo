#!/usr/bin/env bash

set -euo pipefail

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
sudo mkdir -p /opt/resumemo/env /opt/resumemo/deploy/ec2 /opt/resumemo/deploy/nginx
sudo chown -R "$USER":"$USER" /opt/resumemo

cat <<'EOF'
Bootstrap complete.

Next steps:
1. Log out and back in so the docker group takes effect.
2. Copy docker-compose, nginx config, and deploy script into /opt/resumemo.
3. Create /opt/resumemo/env/api.env and /opt/resumemo/env/pipeline.env.
4. Log in to ghcr.io from the EC2 host.
5. Run /opt/resumemo/deploy.sh with image tags.
EOF
