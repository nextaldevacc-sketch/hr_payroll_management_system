#!/usr/bin/env bash
# ==============================================================================
# Nextal HR & Payroll — Production VPS Hardening Script (Ubuntu 24.04 LTS)
# ==============================================================================
# Run once as root on a fresh server:
#   sudo bash deploy/harden-vps.sh
#
# Covers:
# 1. Non-root deploy user creation with sudo & docker privileges
# 2. SSH key setup and safe SSH daemon hardening (prevents owner lockout)
# 3. UFW firewall (allow 22 rate-limited, 80 HTTP, 443 HTTPS; default deny)
# 4. Fail2ban intrusion prevention
# 5. Unattended automatic security upgrades
# 6. Official Docker Engine & Docker Compose install
# 7. System time zone (UTC) & 4GB swap configuration
# ==============================================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "FATAL: This script must be executed as root."
  exit 1
fi

echo "========================================================================"
echo " Starting Nextal Production VPS Hardening (Ubuntu 24.04 LTS)"
echo "========================================================================"

# ------------------------------------------------------------------------------
# 1. System Package Updates & Prerequisites
# ------------------------------------------------------------------------------
echo "[1/8] Updating package lists and upgrading base packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  ufw \
  fail2ban \
  unattended-upgrades \
  htop \
  git \
  openssl

# ------------------------------------------------------------------------------
# 2. Timezone Configuration (UTC system clock)
# UAE statutory payroll cron jobs run at configured Asia/Dubai times in application
# ------------------------------------------------------------------------------
echo "[2/8] Setting system timezone to UTC..."
timedatectl set-timezone UTC

# ------------------------------------------------------------------------------
# 3. Swap Space Configuration (if RAM < 4 GB)
# ------------------------------------------------------------------------------
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
CURRENT_SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')

if [ "$TOTAL_RAM_MB" -lt 4096 ] && [ "$CURRENT_SWAP_MB" -lt 1024 ]; then
  echo "[3/8] Server RAM is ${TOTAL_RAM_MB}MB (< 4096MB). Creating 2GB swap file..."
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.d/99-swappiness.conf
  fi
else
  echo "[3/8] Memory check OK (${TOTAL_RAM_MB}MB RAM, ${CURRENT_SWAP_MB}MB Swap). Skipping swap creation."
fi

# ------------------------------------------------------------------------------
# 4. Create Dedicated 'deploy' User
# ------------------------------------------------------------------------------
DEPLOY_USER="deploy"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "[4/8] Creating dedicated '${DEPLOY_USER}' user..."
  adduser --disabled-password --gecos "Nextal Deployer" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${DEPLOY_USER}"
  chmod 0440 "/etc/sudoers.d/90-${DEPLOY_USER}"
else
  echo "[4/8] User '${DEPLOY_USER}' already exists."
fi

# Copy authorized_keys from root to deploy user if present
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p "/home/${DEPLOY_USER}/.ssh"
  cp /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  chmod 700 "/home/${DEPLOY_USER}/.ssh"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  echo "Copied existing root SSH authorized_keys to ${DEPLOY_USER} user."
fi

# ------------------------------------------------------------------------------
# 5. SSH Daemon Hardening (Prevent Lockout Guard)
# ------------------------------------------------------------------------------
echo "========================================================================"
echo " SSH SECURITY HARDENING"
echo " WARNING: Disabling root login and password authentication requires that"
echo " you have already verified SSH key login as the '${DEPLOY_USER}' user."
echo " If you haven't added your SSH public key to /home/${DEPLOY_USER}/.ssh/authorized_keys,"
echo " you may be locked out."
echo "========================================================================"

read -p "Have you verified SSH key login and wish to disable password authentication? [y/N]: " CONFIRM_SSH || CONFIRM_SSH="n"

if [ "$CONFIRM_SSH" = "y" ] || [ "$CONFIRM_SSH" = "Y" ]; then
  echo "[5/8] Applying SSH hardening (PasswordAuthentication=no, PermitRootLogin=no)..."
  SSHD_CONFIG_FILE="/etc/ssh/sshd_config.d/99-hardened.conf"
  cat <<'EOF' > "$SSHD_CONFIG_FILE"
# Nextal Hardened SSH Configuration
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 4
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
  systemctl restart sshd || systemctl restart ssh
  echo "SSH daemon successfully reconfigured and reloaded."
else
  echo "[5/8] Skipping SSH password authentication disable to prevent accidental lockout."
  echo "You can manually apply /etc/ssh/sshd_config.d/99-hardened.conf after verifying SSH keys."
fi

# ------------------------------------------------------------------------------
# 6. UFW Firewall Configuration
# Allow: SSH (22, rate-limited), HTTP (80 for ACME TLS challenge), HTTPS (443)
# Deny all incoming database, application, and internal ports
# ------------------------------------------------------------------------------
echo "[6/8] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw limit 22/tcp comment 'SSH rate-limited brute force protection'
ufw allow 80/tcp comment 'HTTP automated TLS challenge & redirect'
ufw allow 443/tcp comment 'HTTPS production secure application'
ufw --force enable
ufw status verbose

# ------------------------------------------------------------------------------
# 7. Fail2ban Intrusion Prevention
# ------------------------------------------------------------------------------
echo "[7/8] Configuring fail2ban for SSH brute force protection..."
cat <<'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ------------------------------------------------------------------------------
# 8. Install Docker Engine & Docker Compose from Official Repo
# ------------------------------------------------------------------------------
echo "[8/8] Installing Docker Engine from official Docker apt repository..."
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
else
  echo "Docker is already installed."
fi

# Add deploy user to docker group
usermod -aG docker "$DEPLOY_USER"

echo "========================================================================"
echo " VPS HARDENING COMPLETE!"
echo " Server is ready for Nextal HR & Payroll deployment."
echo " Next Steps:"
echo " 1. Log in as 'deploy': ssh deploy@<your-vps-ip>"
echo " 2. Clone repository and configure .env.production"
echo " 3. Run ./deploy/deploy.sh"
echo "========================================================================"

