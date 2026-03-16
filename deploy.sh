#!/bin/bash
set -e

echo "=== Talke CRM Deploy ==="
echo "Iniciando deploy em $(date)"

# Pull latest code
echo "[1/8] Baixando codigo..."
git pull origin main

# Install dependencies
echo "[2/8] Instalando dependencias..."
composer install --no-dev --optimize-autoloader --no-interaction

# Run migrations
echo "[3/8] Rodando migrations..."
php artisan migrate --force

# Clear and cache
echo "[4/8] Limpando caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "[5/8] Otimizando..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Restart queue workers
echo "[6/8] Reiniciando workers..."
php artisan queue:restart

# SSL certificate (apenas na primeira vez ou renovacao)
echo "[7/8] Verificando SSL..."
if [ ! -f /etc/letsencrypt/live/crm.talke.com.br/fullchain.pem ]; then
    echo "Gerando certificado SSL..."
    certbot certonly --nginx -d crm.talke.com.br --non-interactive --agree-tos -m leandro@gruposeja.com.br || true
fi

# Storage link
echo "[8/8] Storage link..."
php artisan storage:link 2>/dev/null || true

echo ""
echo "=== Deploy concluido com sucesso! ==="
echo "Finalizado em $(date)"
