# AI产品文档审查系统

基于人工智能的智能文档质量分析工具，支持多维度审查和实时反馈。

## 🌟 功能特性

- **📄 多格式文档支持**：支持PDF格式产品文档上传
- **🤖 多AI模型集成**：支持OpenAI GPT-4o-mini、DeepSeek、自定义API
- **📊 多维度分析**：
  - 文档结构分析
  - 设计缺陷检查
  - 逻辑一致性分析
  - 风险评估
  - 综合总结生成
- **⚡ 实时分析进度**：流式输出，实时显示分析进展
- **📈 Token使用统计**：实时显示token消耗和费用
- **📑 标签页结果展示**：可切换查看各阶段分析结果
- **📤 结果导出**：支持JSON和PDF格式导出
- **🌐 跨平台支持**：Windows一键启动脚本，Docker部署支持

## 🛠 技术架构

- **前端**：HTML5 + JavaScript + CSS3
- **后端**：Node.js + Express
- **AI集成**：OpenAI API、DeepSeek API
- **文档处理**：pdf-parse
- **PDF生成**：jsPDF + html2canvas（支持中文编码）
- **实时通信**：Server-Sent Events (SSE)
- **部署方式**：Windows批处理脚本 / Docker

## 📦 安装和启动

### Windows系统

1. **环境要求**：
   - Node.js ≥ 16.0.0
   - Python ≥ 3.0

2. **一键启动**：
   ```bash
   start-system.bat
   ```

3. **访问系统**：
   - 前端UI：http://localhost:8080
   - 后端API：http://localhost:3001
   - 健康检查：http://localhost:3001/api/health

### Docker部署

1. **构建和启动**：
   ```bash
   docker-compose up -d
   ```

2. **访问系统**：
   - 前端UI：http://localhost
   - 后端API：http://localhost:3001

## 🚀 使用指南

1. **配置AI服务**：
   - 选择AI服务提供商（OpenAI/DeepSeek/自定义）
   - 输入API密钥
   - 点击「测试连接」验证配置

2. **上传文档**：
   - 点击上传区域或拖拽PDF文件
   - 等待文件上传完成

3. **开始分析**：
   - 点击「开始分析」按钮
   - 查看实时分析进度和输出

4. **查看结果**：
   - 点击阶段标签切换查看不同维度的分析结果
   - 查看综合总结

5. **导出结果**：
   - 选择「导出JSON」或「导出PDF」
   - 保存分析结果

## 📁 项目结构

```
ProductDocument/
├── backend/                  # 后端服务
│   ├── controllers/          # API控制器
│   ├── services/             # 业务逻辑服务
│   │   ├── aiService.js      # AI服务集成
│   │   ├── documentProcessor.js  # 文档处理服务
│   │   └── tokenCounter.js   # Token统计服务
│   ├── routes/               # API路由
│   ├── middleware/           # 中间件
│   ├── server.js             # 后端入口
│   └── package.json          # 后端依赖
├── frontend/                 # 前端代码
│   ├── index.html            # 主页面
│   ├── script.js             # 核心逻辑
│   └── styles.css            # 样式文件
├── logs/                     # 日志目录
├── docker-compose.yml        # Docker Compose配置
├── Dockerfile.backend        # 后端Dockerfile
├── nginx.conf                # Nginx配置
├── start-system.bat          # Windows启动脚本
└── README.md                 # 项目说明
```

## 🔧 配置说明

### AI服务配置

| 提供商 | API密钥 | 模型 | 费用 |
|--------|---------|------|------|
| OpenAI | sk-xxx  | gpt-4o-mini | 约¥0.00000105/token |
| DeepSeek | xxx | deepseek-chat | 见DeepSeek定价 |
| 自定义 | xxx | 自定义模型 | 自定义 |

### 环境变量

在`.env`文件中配置：

```
PORT=3001
NODE_ENV=development
```

## 📝 系统流程

1. **文档上传**：用户上传PDF文件
2. **文本提取**：后端解析PDF，提取文本内容
3. **阶段化分析**：
   - 文档结构分析
   - 设计缺陷检查
   - 逻辑一致性分析
   - 风险评估
4. **综合总结**：生成完整的分析报告
5. **结果展示**：前端显示各阶段分析结果
6. **结果导出**：支持JSON和PDF格式导出

## 🌟 技术亮点

1. **中文PDF支持**：使用html2canvas解决中文乱码问题
2. **实时流式输出**：使用SSE实现实时分析进度更新
3. **阶段化进度展示**：每个阶段完成后自动更新状态
4. **准确Token统计**：实时显示token使用量和费用
5. **多种AI服务支持**：可切换不同AI服务提供商
6. **一键部署**：Windows脚本和Docker支持

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目地址：https://github.com/your-repo/ai-document-review-system
- 邮箱：your-email@example.com

## 更新日志

### v1.0.0
- 初始版本发布
- 支持PDF文档多维度分析
- 支持实时分析进度展示
- 支持多种AI服务提供商
- 支持结果导出（JSON/PDF）
- 提供Windows启动脚本
- 支持Docker部署

---

**AI产品文档审查系统** - 让文档审查更智能、更高效！