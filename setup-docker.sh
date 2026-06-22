#!/bin/bash
# ==============================================================================
# Script de Instalação do Docker e Docker Compose no Ubuntu
# Sorelle Presentes - VPS Setup
# ==============================================================================

set -e

echo "=== [1/5] Atualizando pacotes do sistema ==="
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

echo "=== [2/5] Configurando o repositório oficial do Docker ==="
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "=== [3/5] Instalando o Docker Engine e Docker Compose ==="
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== [4/5] Habilitando serviço do Docker na inicialização ==="
sudo systemctl enable docker
sudo systemctl start docker

# Cria o grupo docker se não existir e adiciona o usuário atual para não precisar de sudo
if ! getent group docker > /dev/null; then
  sudo groupadd docker
fi
sudo usermod -aG docker $USER || true

echo "=== [5/5] Validando a instalação ==="
docker --version
docker compose version

echo "=============================================================================="
echo " Docker e Docker Compose instalados com sucesso!"
echo " AVISO: Se você estiver logado via SSH, saia e entre novamente para que as"
echo " permissões do grupo 'docker' façam efeito sem a necessidade de usar 'sudo'."
echo "=============================================================================="
