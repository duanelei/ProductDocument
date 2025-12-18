const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const aiService = require('./services/aiService');
const documentProcessor = require('./services/documentProcessor');

// 获取阶段名称的辅助函数
function getStageName(stage) {
  const stageNames = {
    structure: '文档结构分析',
    design: '设计缺陷检查',
    logic: '逻辑一致性分析',
    risk: '风险评估'
  };
  return stageNames[stage] || stage;
}

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    error: 'Rate limit exceeded',
    timestamp: new Date().toISOString()
  }
});

app.use(limiter);
app.use(cors({
  origin: '*', // 允许所有来源，解决跨域问题
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const analysisSessions = new Map();

app.post('/api/analyze', async (req, res) => {
  try {
    const { provider, apiKey, customApiUrl, customModel, fileContent, fileName } = req.body;
    
    if (!provider || !apiKey || !fileContent) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        error: 'provider, apiKey, fileContent 为必填项',
        timestamp: new Date().toISOString()
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 处理Base64编码的PDF文件
    let parsedText = '';
    try {
      const pdfParse = require('pdf-parse');
      
      // 将Base64转换为Buffer
      const pdfBuffer = Buffer.from(fileContent, 'base64');
      
      // 使用pdf-parse解析PDF内容
      const pdfData = await pdfParse(pdfBuffer);
      parsedText = pdfData.text;
      
      if (!parsedText || parsedText.trim().length === 0) {
        throw new Error('PDF文件内容为空或无法解析');
      }
    } catch (pdfError) {
      console.error('PDF解析错误:', pdfError);
      return res.status(400).json({
        success: false,
        message: 'PDF文件解析失败',
        error: pdfError.message,
        timestamp: new Date().toISOString()
      });
    }

    const session = {
      fileId,
      fileContent: parsedText, // 存储解析后的文本内容
      originalFileContent: fileContent, // 保留原始Base64内容（如果需要）
      fileName,
      provider,
      apiKey,
      customApiUrl,
      customModel,
      currentStage: 'structure',
      completedStages: [],
      analysisResults: {}
    };
    
    analysisSessions.set(fileId, session);

    const sendStreamData = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendStreamData({ stage: 'structure', message: '开始文档结构分析...' });

    const structureAnalysis = await documentProcessor.analyzeDocumentStructure(
            parsedText, // 使用解析后的文本进行分析
            provider,
            apiKey,
            customApiUrl,
            customModel,
            sendStreamData
        );

        session.analysisResults.structure = structureAnalysis;
        session.completedStages.push('structure');
        session.currentStage = 'structure';
        
        // 包含token使用数据
        const responseData = { 
            stage: 'structure', 
            message: '文档结构分析完成',
            structureAnalysis 
        };
        
        // 如果有token使用数据，添加到响应中
        if (structureAnalysis.tokenUsage) {
            responseData.tokenUsage = structureAnalysis.tokenUsage;
        }
        
        sendStreamData(responseData);

        // 自动执行剩余阶段
        const stages = ['design', 'logic', 'risk'];
        
        for (const stage of stages) {
            // 执行当前阶段
            sendStreamData({ stage, message: `开始${getStageName(stage)}...` });
            
            const analysisResult = await documentProcessor[`analyze${stage.charAt(0).toUpperCase() + stage.slice(1)}`](
                parsedText,
                provider,
                apiKey,
                customApiUrl,
                customModel,
                sendStreamData
            );

            session.analysisResults[stage] = analysisResult;
            session.completedStages.push(stage);
            session.currentStage = stage;

            // 包含token使用数据
            const stageResponseData = { 
                stage, 
                message: `${getStageName(stage)}完成`,
                analysisResult 
            };
            
            // 如果有token使用数据，添加到响应中
            if (analysisResult.tokenUsage) {
                stageResponseData.tokenUsage = analysisResult.tokenUsage;
            }
            
            sendStreamData(stageResponseData);
        }

        // 所有阶段都已完成
        session.currentStage = 'complete';
        
        // 计算总token使用量
        let totalTokenUsage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total: 0
        };
        
        // 累加所有阶段的token使用量
        for (const [stage, result] of Object.entries(session.analysisResults)) {
            if (result.tokenUsage) {
                totalTokenUsage.prompt_tokens += result.tokenUsage.prompt_tokens || 0;
                totalTokenUsage.completion_tokens += result.tokenUsage.completion_tokens || 0;
                totalTokenUsage.total += result.tokenUsage.total || 0;
            }
        }
        
        // 生成综合总结，传入日志回调
        const comprehensiveSummary = await documentProcessor.generateComprehensiveSummary(
            session.analysisResults,
            provider,
            apiKey,
            customApiUrl,
            customModel,
            (logData) => {
                // 将日志数据通过SSE发送到前端
                sendStreamData({ stage: 'log', logData });
            }
        );
        
        // 更新总token使用量，包括总结生成的token
        if (comprehensiveSummary.tokenUsage) {
            totalTokenUsage.prompt_tokens += comprehensiveSummary.tokenUsage.prompt_tokens || 0;
            totalTokenUsage.completion_tokens += comprehensiveSummary.tokenUsage.completion_tokens || 0;
            totalTokenUsage.total += comprehensiveSummary.tokenUsage.total || 0;
        }
        
        // 包含总token使用数据和综合总结
        const finalResponseData = { 
            stage: 'complete', 
            data: session.analysisResults,
            comprehensiveSummary: comprehensiveSummary.summary,
            totalTokenUsage
        };
        
        sendStreamData(finalResponseData);
        
        // 完成后删除会话
        analysisSessions.delete(fileId);

    res.end();

  } catch (error) {
    console.error('分析错误:', error);
    
    // 使用SSE格式发送错误响应，而不是JSON
    res.write(`data: ${JSON.stringify({
      success: false,
      message: '分析过程中发生错误',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  }
});

app.post('/api/analyze/continue', async (req, res) => {
  try {
    const { fileId, provider, apiKey, customApiUrl, customModel } = req.body;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: '缺少文件标识',
        error: 'fileId 为必填项',
        timestamp: new Date().toISOString()
      });
    }

    const session = analysisSessions.get(fileId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '分析会话不存在或已过期',
        error: 'Session not found',
        timestamp: new Date().toISOString()
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendStreamData = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 确保fileContent是解析后的文本
    const fileContent = session.fileContent;
    
    if (!fileContent || fileContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '会话中的文件内容无效',
        error: 'Invalid file content in session',
        timestamp: new Date().toISOString()
      });
    }

    const stages = ['design', 'logic', 'risk'];
    
    // 执行所有未完成的阶段
    let allCompleted = true;
    for (const stage of stages) {
        if (!session.completedStages.includes(stage)) {
            // 执行当前阶段
            sendStreamData({ stage, message: `开始${getStageName(stage)}...` });
            
            const analysisResult = await documentProcessor[`analyze${stage.charAt(0).toUpperCase() + stage.slice(1)}`](
                fileContent,
                provider || session.provider,
                apiKey || session.apiKey,
                customApiUrl || session.customApiUrl,
                customModel || session.customModel,
                sendStreamData
            );

            session.analysisResults[stage] = analysisResult;
            session.completedStages.push(stage);
            session.currentStage = stage;

            // 包含token使用数据
            const responseData = { 
                stage, 
                message: `${getStageName(stage)}完成`,
                analysisResult 
            };
            
            // 如果有token使用数据，添加到响应中
            if (analysisResult.tokenUsage) {
                responseData.tokenUsage = analysisResult.tokenUsage;
            }
            
            sendStreamData(responseData);
        }
    }

    // 所有阶段都已完成
    session.currentStage = 'complete';
    
    // 计算总token使用量
    let totalTokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total: 0
    };
    
    // 累加所有阶段的token使用量
    for (const [stage, result] of Object.entries(session.analysisResults)) {
        if (result.tokenUsage) {
            totalTokenUsage.prompt_tokens += result.tokenUsage.prompt_tokens || 0;
            totalTokenUsage.completion_tokens += result.tokenUsage.completion_tokens || 0;
            totalTokenUsage.total += result.tokenUsage.total || 0;
        }
    }
    
    // 生成综合总结，传入日志回调
        const comprehensiveSummary = await documentProcessor.generateComprehensiveSummary(
            session.analysisResults,
            provider || session.provider,
            apiKey || session.apiKey,
            customApiUrl || session.customApiUrl,
            customModel || session.customModel,
            (logData) => {
                // 将日志数据通过SSE发送到前端
                sendStreamData({ stage: 'log', logData });
            }
        );
    
    // 更新总token使用量，包括总结生成的token
    if (comprehensiveSummary.tokenUsage) {
        totalTokenUsage.prompt_tokens += comprehensiveSummary.tokenUsage.prompt_tokens || 0;
        totalTokenUsage.completion_tokens += comprehensiveSummary.tokenUsage.completion_tokens || 0;
        totalTokenUsage.total += comprehensiveSummary.tokenUsage.total || 0;
    }
    
    // 包含总token使用数据和综合总结
    const responseData = { 
        stage: 'complete', 
        data: session.analysisResults,
        comprehensiveSummary: comprehensiveSummary.summary,
        totalTokenUsage
    };
    
    sendStreamData(responseData);

    // 完成后删除会话
    analysisSessions.delete(fileId);
    
    res.end();

  } catch (error) {
    console.error('继续分析错误:', error);
    
    // 使用SSE格式发送错误响应，而不是JSON
    res.write(`data: ${JSON.stringify({
      success: false,
      message: '继续分析过程中发生错误',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use((err, req, res, next) => {
  console.error('全局错误处理:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`AI产品文档审查系统后端服务运行在端口 ${PORT}`);
  console.log(`健康检查地址: http://localhost:${PORT}/api/health`);
});

module.exports = app;