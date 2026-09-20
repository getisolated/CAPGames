#!/bin/bash
# =============================================================================
# Préparation d'un VPS Debian 12 fraîchement réinstallé.
# À lancer en root, ou via sudo depuis l'utilisateur OVH par défaut (debian) :
#
#   scp deploy/scripts/server-setup.sh debian@VPS:
#   ssh debian@VPS 'sudo bash server-setup.sh'
#
# - met à jour le système, active les mises à jour de sécurité automatiques
# - installe Docker + compose plugin
# - pare-feu ufw : SSH, 80, 443 uniquement ; fail2ban sur SSH
# - swap 2 Go (le VPS a 4 Go de RAM)
# - utilisateur "deploy" (groupe docker) avec les clés SSH de l'utilisateur
#   qui lance le script (debian ou root)
# - dossier /opt/capgames appartenant à deploy
# =============================================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
[ "$(id -u)" -eq 0 ] || { echo "À lancer en root : sudo bash $0"; exit 1; }

# Clés SSH à donner à l'utilisateur deploy : celles de l'appelant (sudo) sinon root
if [ -n "${SUDO_USER:-}" ] && [ -f "/home/$SUDO_USER/.ssh/authorized_keys" ]; then
  SRC_KEYS="/home/$SUDO_USER/.ssh/authorized_keys"
else
  SRC_KEYS="/root/.ssh/authorized_keys"
fi
[ -s "$SRC_KEYS" ] || { echo "Aucune clé SSH dans $SRC_KEYS : fais d'abord ssh-copy-id depuis ton Mac."; exit 1; }

echo "▶ Mises à jour système"
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl gnupg ufw fail2ban unattended-upgrades rsync

echo "▶ Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "▶ Docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "▶ Swap 2 Go"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

echo "▶ Pare-feu"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "▶ fail2ban (SSH)"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "▶ Utilisateur deploy"
if ! id deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G docker deploy
  mkdir -p /home/deploy/.ssh
  cp "$SRC_KEYS" /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
fi
mkdir -p /opt/capgames
chown -R deploy:deploy /opt/capgames

echo "▶ SSH : clés uniquement"
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

echo ""
echo "✅ Serveur prêt."
echo "   Docker : $(docker --version)"
echo "   Compose: $(docker compose version)"
echo "   Connexion : ssh deploy@$(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
