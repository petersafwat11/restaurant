#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Contabo VPS bootstrap for the restaurant stack.
#
# Usage (FIRST RUN, as root over SSH using the email-emailed password):
#   ssh root@<IP>
#   curl -fsSL https://raw.githubusercontent.com/petersafwat11/restaurant/main/deploy/bootstrap.sh -o bootstrap.sh
#   chmod +x bootstrap.sh
#   DEPLOY_SSH_PUBKEY="ssh-ed25519 AAAA..." ./bootstrap.sh
#
# After this script completes:
#   - root SSH login is DISABLED
#   - SSH password auth is DISABLED
#   - `deploy` user exists with sudo + your pubkey installed
#   - UFW allows only 22, 80, 443
#   - fail2ban + unattended-upgrades running
#   - Docker + Compose plugin installed
#   - /opt/restaurant/ directory tree created
#
# Re-running this script is safe (idempotent).
# -----------------------------------------------------------------------------
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/restaurant}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

if [[ -z "${DEPLOY_SSH_PUBKEY:-}" ]]; then
  echo "DEPLOY_SSH_PUBKEY env var is required (your SSH public key)." >&2
  exit 1
fi

log() { echo -e "\033[1;36m==>\033[0m $*"; }

# -----------------------------------------------------------------------------
# 1. System updates + timezone
# -----------------------------------------------------------------------------
log "Updating apt packages…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg lsb-release ufw fail2ban unattended-upgrades \
  rsync cron tzdata

log "Setting timezone to UTC…"
timedatectl set-timezone UTC || true

# -----------------------------------------------------------------------------
# 2. Swap (4 GB) — useful headroom on an 8 GB box during builds/spikes
# -----------------------------------------------------------------------------
if ! swapon --show | grep -q swapfile; then
  log "Creating 4 GB swap file…"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# -----------------------------------------------------------------------------
# 3. Deploy user with SSH pubkey
# -----------------------------------------------------------------------------
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  log "Creating user $DEPLOY_USER…"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$DEPLOY_USER"
chmod 0440 "/etc/sudoers.d/90-$DEPLOY_USER"

log "Installing SSH pubkey for $DEPLOY_USER…"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
echo "$DEPLOY_SSH_PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"

# -----------------------------------------------------------------------------
# 4. SSH hardening — key-only, no root login
# -----------------------------------------------------------------------------
log "Hardening sshd…"
install -d -m 755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
PubkeyAuthentication yes
PermitEmptyPasswords no
EOF
systemctl restart ssh || systemctl restart sshd || true

# -----------------------------------------------------------------------------
# 5. UFW firewall
# -----------------------------------------------------------------------------
log "Configuring UFW…"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3 (QUIC)'
ufw --force enable

# -----------------------------------------------------------------------------
# 6. fail2ban (default sshd jail)
# -----------------------------------------------------------------------------
log "Enabling fail2ban…"
systemctl enable --now fail2ban

# -----------------------------------------------------------------------------
# 7. Unattended upgrades (security patches auto-applied)
# -----------------------------------------------------------------------------
log "Enabling unattended-upgrades…"
dpkg-reconfigure -f noninteractive unattended-upgrades

# -----------------------------------------------------------------------------
# 8. Docker Engine + Compose plugin (official Docker repo)
# -----------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker…"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

usermod -aG docker "$DEPLOY_USER"

# -----------------------------------------------------------------------------
# 9. App directory tree
# -----------------------------------------------------------------------------
log "Creating $APP_DIR tree…"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
  "$APP_DIR" \
  "$APP_DIR/uploads" \
  "$APP_DIR/backups" \
  "$APP_DIR/scripts"

# Create the shared Docker network used by compose (idempotent).
docker network inspect app-net >/dev/null 2>&1 \
  || docker network create app-net

# -----------------------------------------------------------------------------
# 10. Nightly pg_dump cron
# -----------------------------------------------------------------------------
log "Installing nightly pg_dump cron…"
install -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/stdin "$APP_DIR/scripts/backup-db.sh" <<'BACKUP_EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/restaurant"
TS=$(date -u +%Y%m%d-%H%M%S)
cd "$APP_DIR"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" -Fc "${POSTGRES_DB:-restaurant}" \
  > "$APP_DIR/backups/db-$TS.dump"
find "$APP_DIR/backups" -name 'db-*.dump' -mtime +7 -delete
BACKUP_EOF

CRON_LINE="15 3 * * * cd $APP_DIR && /bin/bash $APP_DIR/scripts/backup-db.sh >> $APP_DIR/backups/cron.log 2>&1"
( crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -v 'backup-db.sh' ; echo "$CRON_LINE" ) | crontab -u "$DEPLOY_USER" -

log "✅ Bootstrap complete."
echo
echo "Next steps:"
echo "  1. From your laptop:  ssh $DEPLOY_USER@<IP>   (root SSH is now disabled)"
echo "  2. Rotate (or lock) the original root password:  sudo passwd -l root"
echo "  3. Drop /opt/restaurant/.env (chmod 600) and docker-compose.yml + Caddyfile."
echo "  4. docker login ghcr.io   (one-time, with a PAT scoped read:packages)"
echo "  5. docker compose pull && docker compose up -d"
