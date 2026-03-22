#!/usr/bin/env bash
# Deep Tree Echo — Level 5 VM Deployment Script
# Deploys Lucy + DTE Orchestrator on a fresh Ubuntu 22.04+ VM
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/o9nn/deltecho/main/deploy/scripts/deploy-vm.sh | bash
#   # or
#   ./deploy-vm.sh [--gpu] [--ctx-size 65536] [--model-url URL]

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────
DTE_HOME="${DTE_HOME:-/opt/deltecho}"
LUCY_MODEL_URL="${LUCY_MODEL_URL:-}"
LUCY_CTX_SIZE="${LUCY_CTX_SIZE:-32768}"
USE_GPU="${USE_GPU:-false}"
LLAMA_CPP_VERSION="${LLAMA_CPP_VERSION:-latest}"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --gpu) USE_GPU=true; shift ;;
    --ctx-size) LUCY_CTX_SIZE="$2"; shift 2 ;;
    --model-url) LUCY_MODEL_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Deep Tree Echo — Level 5 Autonomy Deployment           ║"
echo "║  Lucy (Qwen3-1.7B 128k) + Orchestrator + Echobeats     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── 1. System Dependencies ───────────────────────────────────────
echo "[1/7] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  build-essential cmake git curl wget \
  nodejs npm \
  python3 python3-pip \
  jq

# Install pnpm
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi

# ─── 2. Build llama.cpp ───────────────────────────────────────────
echo "[2/7] Building llama.cpp..."
LLAMA_DIR="${DTE_HOME}/llama.cpp"
if [ ! -d "$LLAMA_DIR" ]; then
  git clone --depth 1 https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
fi
cd "$LLAMA_DIR"

CMAKE_ARGS="-DLLAMA_NATIVE=ON"
if [ "$USE_GPU" = "true" ]; then
  echo "  GPU mode enabled — building with CUDA support"
  CMAKE_ARGS="$CMAKE_ARGS -DGGML_CUDA=ON"
fi

cmake -B build $CMAKE_ARGS
cmake --build build --config Release -j$(nproc)
sudo cp build/bin/llama-server /usr/local/bin/llama-server

# ─── 3. Download Lucy Model ───────────────────────────────────────
echo "[3/7] Setting up Lucy model..."
MODELS_DIR="${DTE_HOME}/models"
mkdir -p "$MODELS_DIR"

if [ ! -f "$MODELS_DIR/lucy_128k-Q4_K_M.gguf" ]; then
  if [ -n "$LUCY_MODEL_URL" ]; then
    echo "  Downloading from $LUCY_MODEL_URL..."
    wget -q --show-progress -O "$MODELS_DIR/lucy_128k-Q4_K_M.gguf" "$LUCY_MODEL_URL"
  else
    echo "  ⚠ No model URL provided. Place lucy_128k-Q4_K_M.gguf in $MODELS_DIR/"
    echo "  Or re-run with: --model-url https://huggingface.co/drzo/lucy-dte/resolve/main/lucy_128k-Q4_K_M.gguf"
  fi
fi

# ─── 4. Clone and Build DTE ───────────────────────────────────────
echo "[4/7] Building Deep Tree Echo..."
DTE_DIR="${DTE_HOME}/deltecho"
if [ ! -d "$DTE_DIR" ]; then
  git clone https://github.com/o9nn/deltecho.git "$DTE_DIR"
fi
cd "$DTE_DIR"
git pull origin main

pnpm install
pnpm build:shared
pnpm --filter deep-tree-echo-core run build
pnpm build:dove9
pnpm build:orchestrator

# ─── 5. Create State Directories ──────────────────────────────────
echo "[5/7] Creating state directories..."
mkdir -p "${DTE_HOME}/state"/{identity,reservoir,memory,deltachat,logs}

# ─── 6. Install Systemd Services ──────────────────────────────────
echo "[6/7] Installing systemd services..."

# Lucy service
cat > /tmp/dte-lucy.service << SERVICEEOF
[Unit]
Description=Deep Tree Echo — Lucy Inference Server (llama.cpp)
After=network.target
Wants=network.target

[Service]
Type=simple
User=$(whoami)
ExecStart=/usr/local/bin/llama-server \
  --model ${MODELS_DIR}/lucy_128k-Q4_K_M.gguf \
  --host 127.0.0.1 \
  --port 8081 \
  --ctx-size ${LUCY_CTX_SIZE} \
  --threads $(( $(nproc) / 2 )) \
  --batch-size 512 \
  --n-predict 2048 \
  --parallel 1 \
  --cont-batching \
  --flash-attn \
  --mlock \
  --log-disable
Restart=always
RestartSec=10
LimitNOFILE=65536
Environment=GGML_METAL_LOG_LEVEL=0

[Install]
WantedBy=multi-user.target
SERVICEEOF
sudo mv /tmp/dte-lucy.service /etc/systemd/system/dte-lucy.service

# Orchestrator service
cat > /tmp/dte-orchestrator.service << SERVICEEOF
[Unit]
Description=Deep Tree Echo — Orchestrator + Echobeats
After=network.target dte-lucy.service
Wants=dte-lucy.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${DTE_DIR}
ExecStart=/usr/bin/node deep-tree-echo-orchestrator/dist/bin/daemon.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LUCY_BASE_URL=http://127.0.0.1:8081
Environment=LUCY_MODEL_NAME=lucy_128k-Q4_K_M
Environment=IDENTITY_STATE_DIR=${DTE_HOME}/state/identity
Environment=RESERVOIR_STATE_DIR=${DTE_HOME}/state/reservoir
Environment=MEMORY_STATE_DIR=${DTE_HOME}/state/memory
Environment=ENABLE_AUTONOMY_PIPELINE=true
Environment=ENABLE_ECHOBEATS=true
Environment=ENABLE_PROACTIVE_PERCEPTION=true
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
SERVICEEOF
sudo mv /tmp/dte-orchestrator.service /etc/systemd/system/dte-orchestrator.service

sudo systemctl daemon-reload
sudo systemctl enable dte-lucy dte-orchestrator

# ─── 7. Summary ───────────────────────────────────────────────────
echo "[7/7] Deployment complete!"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Deep Tree Echo — Level 5 Deployed                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Lucy Server:    http://127.0.0.1:8081                  ║"
echo "║  Orchestrator:   http://127.0.0.1:3000                  ║"
echo "║  State Dir:      ${DTE_HOME}/state/                     ║"
echo "║  Models Dir:     ${MODELS_DIR}/                         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Commands:                                              ║"
echo "║    sudo systemctl start dte-lucy                        ║"
echo "║    sudo systemctl start dte-orchestrator                ║"
echo "║    journalctl -u dte-lucy -f                            ║"
echo "║    journalctl -u dte-orchestrator -f                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
