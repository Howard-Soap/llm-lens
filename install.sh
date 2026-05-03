#!/usr/bin/env bash
#
# LLM Lens 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
#
# 支持: macOS (Intel/Apple Silicon), Linux (Ubuntu/Debian/CentOS/Fedora), WSL
#

set -e

# ========== 颜色和样式 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ========== 工具函数 ==========
info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; }
step()    { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

# ========== 欢迎信息 ==========
echo -e "${CYAN}"
cat << 'EOF'

  ██╗     ██╗     ███╗   ███╗    ██╗     ███████╗███╗   ██╗███████╗
  ██║     ██║     ████╗ ████║    ██║     ██╔════╝████╗  ██║██╔════╝
  ██║     ██║     ██╔████╔██║    ██║     █████╗  ██╔██╗ ██║███████╗
  ██║     ██║     ██║╚██╔╝██║    ██║     ██╔══╝  ██║╚██╗██║╚════██║
  ███████╗███████╗██║ ╚═╝ ██║    ███████╗███████╗██║ ╚████║███████║
  ╚══════╝╚══════╝╚═╝     ╚═╝    ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝

  🔍 See your LLM clearly.

EOF
echo -e "${NC}"

echo -e "${BOLD}  开源、免费、零依赖的 LLM 可观测性工具${NC}"
echo ""
echo -e "  📖 文档: ${BLUE}https://github.com/Howard-Soap/llm-lens${NC}"
echo ""

# ========== 检测操作系统 ==========
step "检测操作系统..."

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin*)
        OS_NAME="macOS"
        if [ "$ARCH" = "arm64" ]; then
            ARCH_NAME="Apple Silicon (M1/M2/M3)"
        else
            ARCH_NAME="Intel"
        fi
        ;;
    Linux*)
        if grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null; then
            OS_NAME="Windows WSL"
        else
            OS_NAME="Linux"
        fi
        ARCH_NAME="$ARCH"
        ;;
    *)
        error "不支持的操作系统: $OS"
        echo "  请参考手动安装文档: https://github.com/Howard-Soap/llm-lens/blob/main/docs/getting-started.md"
        exit 1
        ;;
esac

success "操作系统: $OS_NAME ($ARCH_NAME)"

# ========== 检测 Docker ==========
step "检测 Docker..."

if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null | head -1)
    success "Docker 已安装: $DOCKER_VERSION"
else
    warn "Docker 未安装，正在帮你安装..."
    echo ""

    case "$OS" in
        Darwin*)
            info "macOS 需要安装 Docker Desktop"
            echo ""
            echo "  请按以下步骤操作："
            echo ""
            echo "  1. 打开浏览器，访问："
            echo -e "     ${BLUE}${BOLD}https://www.docker.com/products/docker-desktop/${NC}"
            echo ""
            echo "  2. 点击 \"Download for Mac\""
            if [ "$ARCH" = "arm64" ]; then
                echo "     （选择 Apple Chip 版本）"
            else
                echo "     （选择 Intel Chip 版本）"
            fi
            echo ""
            echo "  3. 双击下载的 .dmg 文件，把 Docker 拖到 Applications"
            echo ""
            echo "  4. 打开 Docker Desktop，等图标不再转圈后"
            echo ""
            echo -e "  5. ${BOLD}重新运行这个安装脚本${NC}"
            echo ""
            exit 0
            ;;
        Linux*)
            info "正在安装 Docker..."
            echo ""

            # 检测包管理器
            if command -v apt-get &>/dev/null; then
                # Ubuntu/Debian
                sudo apt-get update -qq
                sudo apt-get install -y -qq curl ca-certificates gnupg

                # 添加 Docker 官方 GPG key
                sudo install -m 0755 -d /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
                sudo chmod a+r /etc/apt/keyrings/docker.gpg

                # 添加 Docker 仓库
                echo \
                  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
                  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
                  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

                sudo apt-get update -qq
                sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            elif command -v dnf &>/dev/null; then
                # Fedora
                sudo dnf -y install dnf-plugins-core
                sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
                sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            elif command -v yum &>/dev/null; then
                # CentOS
                sudo yum install -y yum-utils
                sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            else
                error "无法识别包管理器，请手动安装 Docker"
                echo "  参考: https://docs.docker.com/engine/install/"
                exit 1
            fi

            # 启动 Docker
            sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
            sudo systemctl enable docker 2>/dev/null || true

            # 把当前用户加入 docker 组
            if ! groups | grep -q docker; then
                sudo usermod -aG docker "$USER"
                warn "已将你加入 docker 用户组"
                warn "你可能需要注销并重新登录才能生效"
                warn "或者运行: newgrp docker"
            fi

            success "Docker 安装完成！"
            ;;
    esac
fi

# ========== 检测 Docker 是否在运行 ==========
step "检测 Docker 是否在运行..."

if docker info &>/dev/null; then
    success "Docker 正在运行"
else
    warn "Docker 已安装但没有运行"
    echo ""
    case "$OS" in
        Darwin*)
            echo "  请打开 Docker Desktop 应用："
            echo "  1. 按 Cmd+空格，输入 \"Docker\"，回车"
            echo "  2. 等右上角 Docker 图标不再转圈"
            echo "  3. 重新运行这个安装脚本"
            ;;
        Linux*)
            echo "  请启动 Docker 服务："
            echo "  sudo systemctl start docker"
            echo ""
            echo "  然后重新运行这个安装脚本"
            ;;
    esac
    echo ""
    exit 1
fi

# ========== 下载项目 ==========
step "下载 LLM Lens..."

INSTALL_DIR="$HOME/llm-lens"

if [ -d "$INSTALL_DIR" ]; then
    info "目录已存在: $INSTALL_DIR"
    info "正在更新..."
    cd "$INSTALL_DIR"
    git pull 2>/dev/null || {
        warn "更新失败，使用现有版本"
    }
else
    if command -v git &>/dev/null; then
        git clone https://github.com/Howard-Soap/llm-lens.git "$INSTALL_DIR" 2>/dev/null || {
            warn "git clone 失败，尝试下载 zip..."
            curl -fsSL https://github.com/Howard-Soap/llm-lens/archive/refs/heads/main.zip -o /tmp/llm-lens.zip
            unzip -q /tmp/llm-lens.zip -d /tmp/
            mv /tmp/llm-lens-main "$INSTALL_DIR"
            rm -f /tmp/llm-lens.zip
        }
    else
        info "正在下载..."
        curl -fsSL https://github.com/Howard-Soap/llm-lens/archive/refs/heads/main.zip -o /tmp/llm-lens.zip
        unzip -q /tmp/llm-lens.zip -d /tmp/
        mv /tmp/llm-lens-main "$INSTALL_DIR"
        rm -f /tmp/llm-lens.zip
    fi
    cd "$INSTALL_DIR"
fi

success "项目下载完成: $INSTALL_DIR"

# ========== 启动服务 ==========
step "启动 LLM Lens..."

# 检测 docker compose 命令
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    error "找不到 docker compose 命令"
    echo "  请确保 Docker Desktop 已正确安装并运行"
    exit 1
fi

# 拉取镜像并启动
$COMPOSE_CMD pull 2>/dev/null || true
$COMPOSE_CMD up -d

success "服务启动完成！"

# ========== 等待服务就绪 ==========
step "等待服务就绪..."

MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000/health &>/dev/null; then
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -ne "\r  等待中... ${WAITED}s"
done
echo ""

if curl -s http://localhost:3000/health &>/dev/null; then
    success "服务已就绪！"
else
    warn "服务可能还在启动中，请稍等片刻后访问 http://localhost:3000"
fi

# ========== 完成 ==========
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║                                                          ║"
echo "  ║   🎉  LLM Lens 安装成功！                               ║"
echo "  ║                                                          ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "  ${BOLD}📊 监控面板:${NC}  ${BLUE}http://localhost:3000${NC}"
echo -e "  ${BOLD}📡 代理地址:${NC}  ${BLUE}http://localhost:3000/v1${NC}"
echo ""

echo -e "  ${BOLD}🚀 接入你的应用（只需改一行）:${NC}"
echo ""
echo "  Python:"
echo -e "  ${CYAN}"
echo '    client = openai.OpenAI('
echo '        api_key="sk-your-key",'
echo '        base_url="http://localhost:3000/v1"  # ← 加这一行'
echo '    )'
echo -e "  ${NC}"
echo "  JavaScript:"
echo -e "  ${CYAN}"
echo '    const client = new OpenAI({'
echo '        apiKey: "sk-your-key",'
echo '        baseURL: "http://localhost:3000/v1"  // ← 加这一行'
echo '    })'
echo -e "  ${NC}"

echo -e "  ${BOLD}📖 更多文档:${NC}  ${BLUE}https://github.com/Howard-Soap/llm-lens${NC}"
echo -e "  ${BOLD}💬 遇到问题?${NC}  ${BLUE}https://github.com/Howard-Soap/llm-lens/issues${NC}"
echo ""
echo -e "  ${YELLOW}💡 提示: 如果你喜欢 LLM Lens，别忘了去 GitHub 点个 Star ⭐${NC}"
echo ""
