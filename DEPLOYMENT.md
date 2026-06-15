# AlphaPath 部署指南

## 架构说明

```
┌─────────────────┐      ┌─────────────────┐
│   前端 (IGA)    │ ──── │   后端 (Railway) │
│   静态托管      │ API  │   Node.js + SQLite│
└─────────────────┘      └─────────────────┘
```

## 部署步骤

### 1. 部署后端到 Railway

1. 访问 [railway.app](https://railway.app) 并登录（可用 GitHub 账号）
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测 Node.js 项目并部署
5. 部署完成后，复制 Railway 给你分配的域名（例如：`alphapath-api.up.railway.app`）
6. 在 Railway 控制台设置环境变量：
   - `PORT`: 3001
   - `JWT_SECRET`: 你的随机密钥（至少32字符）

### 2. 配置前端环境变量

在 `.env.production` 文件中更新后端地址：
```
VITE_API_URL=https://你的Railway域名/api
```

### 3. 部署前端到 IGA Pages

```bash
# 登录
iga login

# 部署
cd /workspace
iga pages deploy --name alphapath
```

### 4. 配置前端 API 地址（重要）

在 IGA Pages 控制台设置环境变量：
- `VITE_API_URL`: `https://你的Railway域名/api`

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端同时运行）
npm run dev
```

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Zustand
- **后端**: Express.js + TypeScript + SQLite
- **数据库**: SQLite（本地文件，Railway 提供持久化存储）
- **认证**: JWT

## 注意事项

1. Railway 免费套餐每月有 500 小时限制（休眠后不计时）
2. SQLite 数据库文件存储在 Railway 的持久化存储中
3. 建议在 Railway 中开启 "Always On" 避免休眠（付费功能）
4. 首次部署可能需要 2-3 分钟完成构建
