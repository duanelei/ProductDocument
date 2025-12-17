# AI产品文档审查系统

基于人工智能的智能文档质量分析工具，专门用于自动化分析和评估产品文档的质量。

## 功能特性

### 核心功能模块
- **文档结构分析**：自动解析PDF文档的章节结构
- **设计缺陷检查**：识别UI/UX设计问题和交互逻辑缺陷
- **逻辑一致性分析**：检查文档内容的逻辑矛盾和一致性
- **风险评估**：评估技术实现风险和业务影响风险

### 特色功能
- **智能暂停恢复机制**：分阶段分析，用户可控制分析流程
- **多AI提供商支持**：OpenAI、DeepSeek、自定义API服务
- **实时流式响应**：Server-Sent Events (SSE) 实时进度显示
- **现代化用户界面**：响应式设计，直观的操作体验

## 技术架构

### 前端技术栈
- HTML5 + CSS3 + 原生JavaScript
- PDF.js (PDF解析)
- Fetch API (HTTP请求)
- EventSource (SSE流式接收)

### 后端技术栈
- Node.js + Express.js
- Multer (文件上传)
- PDF-parse (PDF解析)
- Axios (HTTP客户端)

### AI服务集成
- OpenAI GPT-4o-mini
- DeepSeek API
- 自定义API服务支持

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- 现代浏览器支持
- 可访问外部AI服务API

### 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend && npm install
```

### 开发环境运行
```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:backend  # 后端服务 (端口3001)
npm run dev:frontend # 前端服务 (端口8080)
```

### 生产环境部署
```bash
# PM2进程管理
npm run pm2:start

# Docker容器化
npm run docker:build
npm run docker:run

# 腾讯云部署
npm run deploy
```

## 配置说明

### 环境变量 (.env)
```bash
PORT=3001
FRONTEND_URL=http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DEFAULT_AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4o-mini
```

### AI服务配置
1. **OpenAI配置**
   - 提供商: `openai`
   - API密钥: 从OpenAI平台获取
   - 默认模型: `gpt-4o-mini`

2. **DeepSeek配置**
   - 提供商: `deepseek`
   - API密钥: 从DeepSeek平台获取
   - 默认模型: `deepseek-chat`

3. **自定义API配置**
   - 提供商: `custom`
   - API地址: 自定义端点URL
   - 模型名称: 自定义模型标识

## 使用指南

### 基本使用流程
1. **配置API密钥**
   - 选择AI服务提供商
   - 输入有效的API密钥
   - 保存配置

2. **上传文档分析**
   - 选择PDF文档文件
   - 点击"开始分析"按钮
   - 等待文档结构分析完成

3. **继续后续分析**
   - 结构分析完成后弹窗关闭
   - 页面显示"继续分析"按钮
   - 点击继续执行设计、逻辑、风险分析

4. **查看分析结果**
   - 实时查看各阶段分析进度
   - 查看详细的分析报告
   - 导出JSON格式结果

### API接口

#### POST `/api/analyze` - 初始分析
```javascript
// 请求格式
{
  fileContent: string,           // 文件文本内容
  provider: string,             // AI提供商
  apiKey: string,              // API密钥
  customApiUrl?: string,       // 自定义API地址
  customModel?: string         // 自定义模型
}

// 响应格式 (流式)
data: { stage: 'structure', message: '开始文档结构分析...' }
data: { stage: 'structure', chunk: '分析内容片段...' }
data: { stage: 'paused', fileId: 'xxx', structureAnalysis: {...} }
```

#### POST `/api/analyze/continue` - 继续分析
```javascript
// 请求格式
{
  fileId: string,              // 文件标识
  provider: string,            // AI提供商
  apiKey: string,             // API密钥
  customApiUrl?: string,      // 自定义API地址
  customModel?: string        // 自定义模型
}

// 响应格式 (分阶段流式)
data: { stage: 'design', message: '开始设计缺陷检查...' }
data: { stage: 'logic', message: '开始逻辑一致性分析...' }
data: { stage: 'risk', message: '开始风险评估...' }
data: { stage: 'complete', data: { /* 完整结果 */ } }
```

## 故障排除

### 常见问题

#### 文件上传失败
- 检查文件格式是否为PDF
- 确认文件大小不超过10MB限制
- 验证网络连接状态

#### 分析过程中断
- 检查API密钥有效性
- 确认AI服务配额充足
- 查看服务器日志排查问题

#### 结果显示异常
- 刷新页面重新分析
- 检查浏览器控制台错误信息
- 验证PDF文档可读性

### 性能优化建议
- **大文件处理**：分段上传和流式处理
- **并发控制**：合理的请求频率限制
- **缓存策略**：分析结果缓存复用

## 项目结构

```
ai-document-review-system/
├── backend/                 # 后端服务
│   ├── services/           # 核心服务模块
│   │   ├── aiService.js    # AI服务集成
│   │   └── documentProcessor.js # 文档处理器
│   ├── server.js           # Express服务器
│   └── package.json        # 后端依赖配置
├── frontend/               # 前端界面
│   ├── index.html          # 主页面
│   ├── styles.css          # 样式文件
│   └── script.js           # 交互逻辑
├── .env                    # 环境配置
├── package.json            # 项目配置
└── README.md              # 项目文档
```

## 开发指南

### 代码规范
- 使用ES6+语法特性
- 遵循Airbnb JavaScript代码风格
- 使用async/await处理异步操作
- 统一的错误处理机制

### 扩展开发
1. **添加新的分析维度**
   - 在`documentProcessor.js`中添加新的分析方法
   - 更新前端界面显示新的分析结果
   - 修改API接口支持新的分析阶段

2. **集成新的AI服务**
   - 在`aiService.js`中添加新的提供商支持
   - 更新前端配置选项
   - 测试新的API集成

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目Issue: [GitHub Issues]
- 邮箱: team@ai-document-review.com