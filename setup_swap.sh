#!/bin/bash
set -e

echo "Turning off swap..."
swapoff /swapfile || true

echo "Resizing swapfile to 8GB..."
rm -f /swapfile
fallocate -l 8G /swapfile
chmod 600 /swapfile

echo "Formatting swapfile..."
mkswap /swapfile

echo "Enabling swap..."
swapon /swapfile

echo "Configuring swappiness..."
sysctl vm.swappiness=10
if ! grep -q "vm.swappiness=10" /etc/sysctl.conf; then
    echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

echo "Cleaning fstab..."
# Remove all lines referring to /swapfile
sed -i '/\/swapfile/d' /etc/fstab
# Add single correct line
echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "Done. Verifying:"
free -h
