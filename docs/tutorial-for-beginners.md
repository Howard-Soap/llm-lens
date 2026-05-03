# 📖 LLM Lens 零基础教程

> 完全不懂代码也能看懂的教程。如果你会复制粘贴，你就能用 LLM Lens。

---

## 🤔 LLM Lens 是什么？

**一句话解释：** LLM Lens 就像手机的「流量监控」，只不过它监控的是你的 AI 调用。

你用 OpenAI、Claude 这些 AI 的时候，有没有想过：
- 我到底花了多少钱？💸
- 每次请求快不快？⚡
- Agent 是怎么一步步思考的？🧠

LLM Lens 帮你回答这些问题。而且它是**免费**的，数据都在你电脑上，不会上传到别人那里。

---

## 📋 你需要什么？

| 你需要 | 说明 |
|--------|------|
| ✅ 一台电脑 | Mac、Windows、Linux 都行 |
| ✅ 能上网 | 要下载东西 |
| ✅ 会复制粘贴 | 复制命令 → 粘贴到终端 → 回车，就这三步 |

**你不需要：**
- ❌ 会写代码
- ❌ 懂编程知识
- ❌ 花钱

---

## 第 1 步：安装 Docker

### Docker 是什么？

Docker 就像一个「万能运行器」——它能让任何程序在你的电脑上跑起来，不管你的电脑是什么系统。

你可以把它理解为一个「虚拟的小电脑」，LLM Lens 就在这个小电脑里运行，不会影响你电脑上的其他东西。

### 怎么安装？

#### 🍎 Mac 用户

1. **打开浏览器**，访问：https://www.docker.com/products/docker-desktop/

2. **点击蓝色按钮**「Download for Mac」
   - 如果你的 Mac 是 M1/M2/M3/M4 芯片（2020 年以后买的），选 **Apple Chip** 版本
   - 如果你的 Mac 是 Intel 芯片（2020 年以前买的），选 **Intel Chip** 版本
   - 不确定？直接选 Apple Chip，装错了会提示你的

3. **双击下载的文件**（名字类似 `Docker.dmg`）

4. **把 Docker 图标拖到 Applications 文件夹**（就像装其他 Mac 软件一样）

5. **打开 Docker Desktop**
   - 按 `Cmd + 空格`，输入 `Docker`，回车
   - 第一次打开会要求你输入电脑密码，输入就行

6. **等 Docker 启动完成**
   - 你会看到屏幕右上角出现一个鲸鱼图标 🐳
   - 等它不再转圈圈（大约 1-2 分钟），就说明启动好了

#### 🪟 Windows 用户

1. **打开浏览器**，访问：https://www.docker.com/products/docker-desktop/

2. **点击蓝色按钮**「Download for Windows」

3. **双击下载的文件**，按提示安装

4. **安装完重启电脑**

5. **打开 Docker Desktop**
   - 点击桌面上的 Docker 图标，或者在开始菜单搜索 `Docker`

6. **等 Docker 启动完成**
   - 你会看到右下角出现一个鲸鱼图标 🐳
   - 等它不再转圈圈，就说明启动好了

> ⚠️ **Windows 用户注意：** Docker 需要开启「虚拟化」功能。如果你的电脑比较老（2015 年以前），可能不支持。装不上也没关系，可以试试 [在线体验版](#在线体验)。

#### 🐧 Linux 用户

打开终端，复制粘贴下面的命令，回车：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## 第 2 步：安装 LLM Lens

### 方法一：一键安装（推荐）

打开终端，复制粘贴下面的命令，回车：

```bash
curl -fsSL https://raw.githubusercontent.com/Howard-Soap/llm-lens/main/install.sh | bash
```

等它跑完，你会看到：

```
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   🎉  LLM Lens 安装成功！                               ║
  ║                                                          ║
  ╚════════════════════════════════这就成功了！

### 方法二：手动安装（如果一键安装失败）

1. **下载项目**
   - 打开 https://github.com/Howard-Soap/llm-lens
   - 点绿色的「Code」按钮 → 「Download ZIP」
   - 解压下载的文件

2. **打开终端，进入项目目录**
   ```bash
   cd ~/Downloads/llm-lens-main
   ```
   （如果你解压到了其他地方，改成对应的路径）

3. **启动服务**
   ```bash
   docker compose up -d
   ```

---

## 第 3 步：打开监控面板

1. **打开浏览器**（Chrome、Safari、Edge 都行）

2. **地址栏输入：** `http://localhost:3000`

3. **回车**

你会看到 LLM Lens 的监控面板 🎉

> 💡 **打不开？** 先别慌，看看终端里有没有报错信息。如果显示 `Waiting for services...`，说明还在启动，等 1-2 分钟再刷新试试。

---

## 第 4 步：接入你的应用

### 什么是「接入」？

就是告诉你的程序：「以后发 AI 请求的时候，先经过 LLM Lens，这样它就能帮你记录了。」

就像给手机装了流量监控 APP 一样，你的 AI 请求会先经过 LLM Lens，然后再发给 OpenAI/Claude。

### 怎么接入？

**只需要加一行代码！**

#### Python 用户

找到你代码里创建 OpenAI 客户端的地方，大概是这样：

```python
import openai

client = openai.OpenAI(
    api_key="sk-xxx"
)
```

**加上一行 `base_url`：**

```python
import openai

client = openai.OpenAI(
    api_key="sk-xxx",
    base_url="http://localhost:3000/v1"  # ← 加这一行
)
```

其他代码完全不用改！

#### JavaScript / TypeScript 用户

```javascript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'sk-xxx',
  baseURL: 'http://localhost:3000/v1'  // ← 加这一行
})
```

#### 其他语言

只要你的代码用了 OpenAI API，找到设置 `base_url` 或 `baseURL` 的地方，改成 `http://localhost:3000/v1` 就行。

---

## 第 5 步：看看你的数据

1. **运行你的程序**（就像平时一样运行）

2. **回到浏览器**，打开 `http://localhost:3000`

3. **刷新页面**（按 F5 或 Cmd+R）

你会看到：
- 📊 **请求数量** — 你的程序发了多少次 AI 请求
- 💰 **花了多少钱** — 每个模型分别花了多少
- ⚡ **响应速度** — 每次请求花了多长时间
- 📝 **请求详情** — 每次请求发了什么、收到了什么

---

## ❓ 常见问题

### Q: 终端显示 "command not found: docker"
**A:** 你还没安装 Docker。回到「第 1 步」安装它。

### Q: 终端显示 "Cannot connect to the Docker daemon"
**A:** Docker 没有启动。打开 Docker Desktop 应用，等右上角的鲸鱼图标不再转圈。

### Q: 浏览器打不开 http://localhost:3000
**A:** 
1. 先检查终端有没有报错
2. 确认 Docker 在运行（鲸鱼图标不转圈）
3. 等 1-2 分钟再刷新试试
4. 如果还是不行，重启 Docker Desktop，然后重新运行安装命令

### Q: 改了 base_url 但看不到数据
**A:**
1. 确认你的程序确实调用了 AI API（加个 `print` 看看）
2. 确认 LLM Lens 在运行（终端执行 `docker ps`）
3. 刷新浏览器页面

### Q: 我的 API Key 安全吗？
**A:** 安全。LLM Lens 不会存储你的 API Key，它只是「路过」一下，帮你记录请求信息，然后把请求转发给 OpenAI/Claude。就像快递员帮你寄包裹，但不会拆开看里面是什么。

### Q: 支持哪些 AI 模型？
**A:** 所有兼容 OpenAI API 的模型都支持，包括：
- OpenAI（GPT-4、GPT-4o、GPT-3.5）
- Claude（Opus、Sonnet、Haiku）
- DeepSeek
- Ollama（本地模型）
- 任何兼容 OpenAI API 的模型

---

## 🎓 进阶学习

- [🚀 快速开始](getting-started.md) — 更多接入方式
- [⚙️ 配置说明](configuration.md) — 自定义设置
- [❓ 常见问题](FAQ.md) — 更多问题解答

---

## 💬 还有问题？

- 在 GitHub 上提 Issue：https://github.com/Howard-Soap/llm-lens/issues
- 我们会尽快回复！

---

**恭喜你！** 🎉 你现在已经是 LLM Lens 用户了！
