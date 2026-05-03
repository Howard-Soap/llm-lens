# ❓ 常见问题 (FAQ)

> 遇到问题先看这里，90% 的问题都能解决。

---

## 📦 安装相关

### Q: "command not found: docker" 是什么意思？

**A:** 你的电脑还没安装 Docker。

**解决方法：**
1. 去 https://www.docker.com/products/docker-desktop/ 下载 Docker Desktop
2. 双击安装（Mac 拖到 Applications，Windows 一路下一步）
3. 打开 Docker Desktop，等鲸鱼图标不再转圈
4. 重新运行安装命令

---

### Q: "Cannot connect to the Docker daemon" 怎么办？

**A:** Docker 已经装了，但是没有启动。

**解决方法：**
1. 打开 Docker Desktop 应用
2. 等右上角（Mac）或右下角（Windows）的鲸鱼图标不再转圈
3. 重新运行安装命令

**Mac 用户：** 按 `Cmd+空格`，输入 `Docker`，回车打开
**Windows 用户：** 在开始菜单搜索 `Docker Desktop`，点击打开

---

### Q: "Port 3000 is already in use" 端口被占用了

**A:** 你的电脑上有其他程序在用 3000 端口。

**解决方法一：停掉占用端口的程序**
```bash
# Mac/Linux 查看谁在用 3000 端口
lsof -i :3000

# 杀掉那个进程（把 PID 换成上面看到的数字）
kill -9 PID
```

**解决方法二：换一个端口**

编辑项目里的 `docker-compose.yml`，找到 `ports` 那一行：

```yaml
ports:
  - "127.0.0.1:3000:3000"  # 改成下面这样
  - "127.0.0.1:3001:3000"  # 用 3001 端口
```

然后重启：
```bash
docker compose down
docker compose up -d
```

访问地址改成 `http://localhost:3001`

---

### Q: "docker-compose: command not found"

**A:** 新版 Docker 把 compose 内置了，命令不一样。

**解决方法：** 用 `docker compose`（没有横杠）代替 `docker-compose`

```bash
# 旧命令（可能报错）
docker-compose up -d

# 新命令（推荐）
docker compose up -d
```

---

### Q: 下载很慢 / 连接超时

**A:** 可能是网络问题，Docker 镜像在国内下载比较慢。

**解决方法：配置 Docker 镜像加速**

创建或编辑 Docker 配置文件：

```bash
# Mac/Linux
mkdir -p ~/.docker
cat > ~/.docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF

# 重启 Docker
# Mac: 点击 Docker 图标 → Restart
# Linux:
sudo systemctl restart docker
```

**Windows 用户：**
1. 打开 Docker Desktop 设置（Settings）
2. 找到 Docker Engine
3. 在 JSON 里加上 `registry-mirrors` 那段
4. 点 Apply & Restart

---

## 🖥️ 使用相关

### Q: 改了 base_url 但看不到数据

**A:** 按顺序检查：

1. **LLM Lens 在运行吗？**
   ```bash
   docker ps
   ```
   应该能看到 `llm-lens-proxy`、`llm-lens-api`、`llm-lens-web` 三个容器

2. **base_url 写对了吗？**
   - 应该是 `http://localhost:3000/v1`
   - 注意是 `http` 不是 `https`
   - 注意末尾有 `/v1`

3. **程序真的调用 API 了吗？**
   在代码里加一行 `print("开始调用 API...")` 确认一下

4. **刷新浏览器**
   按 `F5` 或 `Cmd+R` 刷新页面

---

### Q: 看到的数据是旧的

**A:** LLM Lens 是实时记录的，但浏览器可能有缓存。

**解决方法：** 硬刷新浏览器
- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + R`

---

### Q: 我的 API Key 安全吗？

**A:** 安全！LLM Lens 的安全设计：

- ✅ **不存储 API Key** — 只在内存中转发，不写入数据库
- ✅ **日志脱敏** — 日志里只显示 Key 的后四位，比如 `****1234`
- ✅ **本地运行** — 数据都在你电脑上，不会上传到任何地方
- ✅ **开源透明** — 代码完全公开，你可以自己检查

就像快递员帮你寄包裹，他需要看地址，但不会拆开看里面是什么。

---

### Q: 支持哪些 AI 模型？

**A:** 所有兼容 OpenAI API 的模型都支持：

| 提供商 | 模型 | 状态 |
|--------|------|------|
| **OpenAI** | GPT-4, GPT-4o, GPT-3.5 Turbo | ✅ |
| **Anthropic** | Claude 3 Opus/Sonnet/Haiku | ✅ |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | ✅ |
| **Ollama** | Llama, Mistral, CodeLlama 等本地模型 | ✅ |
| **其他** | 任何兼容 OpenAI API 的模型 | ✅ |

---

### Q: 能监控多少请求？有上限吗？

**A:** 没有硬性上限。数据存在 SQLite 里，一般几十万条请求都没问题。

如果你的请求量特别大（每天几万条以上），可以考虑：
1. 定期清理旧数据
2. 调整数据保留策略（在配置文件里设置）

---

### Q: 能多人一起用吗？

**A:** 可以！有两种方式：

1. **局域网共享** — 同一个网络里的人都能访问，把 `localhost` 换成你电脑的 IP 地址
2. **部署到服务器** — 部署到公司服务器，大家都能用

---

## 🔧 配置相关

### Q: 怎么修改端口？

**A:** 编辑 `docker-compose.yml`，修改 `ports` 部分：

```yaml
ports:
  - "127.0.0.1:3001:3000"  # 把 3000 改成你想要的端口
```

然后重启：
```bash
docker compose down
docker compose up -d
```

---

### Q: 怎么备份数据？

**A:** LLM Lens 的数据存在 Docker 卷里。

```bash
# 查看数据卷位置
docker volume inspect llm-lens-data

# 备份
docker run --rm -v llm-lens-data:/data -v $(pwd):/backup alpine tar czf /backup/llm-lens-backup.tar.gz /data

# 恢复
docker run --rm -v llm-lens-data:/data -v $(pwd):/backup alpine tar xzf /backup/llm-lens-backup.tar.gz -C /
```

---

### Q: 怎么完全卸载 LLM Lens？

**A:**

```bash
# 停止并删除容器
cd ~/llm-lens
docker compose down

# 删除数据（可选，不删的话下次装回来还有数据）
docker volume rm llm-lens-data

# 删除项目文件
rm -rf ~/llm-lens
```

---

### Q: 怎么更新到最新版本？

**A:**

```bash
cd ~/llm-lens
git pull
docker compose down
docker compose up -d
```

或者重新运行一键安装脚本，它会自动更新。

---

## 🆘 还是解决不了？

如果上面的方法都不管用：

1. **查看日志**
   ```bash
   cd ~/llm-lens
   docker compose logs
   ```
   把错误信息复制下来

2. **在 GitHub 提 Issue**
   - 访问：https://github.com/Howard-Soap/llm-lens/issues
   - 点「New Issue」
   - 描述你遇到的问题，附上错误信息
   - 我们会尽快回复！

3. **检查 Docker 是否正常**
   ```bash
   docker run hello-world
   ```
   如果这个也报错，说明 Docker 本身有问题，需要重新安装 Docker

---

**最后更新：2026-05-03**
