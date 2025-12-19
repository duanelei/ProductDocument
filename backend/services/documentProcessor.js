const aiService = require('./aiService');

class DocumentProcessor {
  constructor() {
    this.analysisTemplates = {
      structure: {
        systemPrompt: `你是一个专业的文档结构分析专家。请直接分析以下产品文档的结构，识别章节组织、内容层次和整体架构，不要包含任何引导性语句。

请按照以下格式提供分析结果：
1. 文档大纲结构
2. 章节层次分析
3. 内容组织评价
4. 结构改进建议
5. 综合评分（1-10分，分数越高表示结构越完善）

注意：直接输出分析结果，不要添加任何开场白或介绍性文字。`,
        userPrompt: (content) => `请分析以下文档的结构：

${content.substring(0, 50000)}`
      },
      design: {
        systemPrompt: `你是一个专业的UI/UX设计专家。请直接分析以下产品文档中的设计缺陷，包括界面设计、用户体验和交互逻辑问题，不要包含任何引导性语句。

请按照以下维度分析：
1. 界面设计一致性
2. 用户体验流畅性
3. 交互逻辑合理性
4. 具体问题描述和改进建议
5. 综合评分（1-10分，分数越高表示设计越完善）

注意：直接输出分析结果，不要添加任何开场白或介绍性文字。`,
        userPrompt: (content) => `请分析以下文档中的设计缺陷：

${content.substring(0, 50000)}`
      },
      logic: {
        systemPrompt: `你是一个专业的逻辑分析专家。请直接检查以下产品文档内容的逻辑一致性和合理性，不要包含任何引导性语句。

请重点关注：
1. 前后描述一致性
2. 技术方案可行性
3. 业务流程合理性
4. 逻辑矛盾识别和修正建议
5. 综合评分（1-10分，分数越高表示逻辑越严谨）

注意：直接输出分析结果，不要添加任何开场白或介绍性文字。`,
        userPrompt: (content) => `请分析以下文档的逻辑一致性：

${content.substring(0, 50000)}`
      },
      risk: {
        systemPrompt: `你是一个专业的风险评估专家。请直接评估以下产品文档中描述的技术实现风险和业务影响风险，不要包含任何引导性语句。

请按照以下维度评估：
1. 技术复杂度风险
2. 实施可行性风险
3. 业务影响风险
4. 风险等级评估和缓解建议
5. 综合评分（1-10分，分数越高表示风险越低）

注意：直接输出分析结果，不要添加任何开场白或介绍性文字。`,
        userPrompt: (content) => `请评估以下文档中的风险：

${content.substring(0, 50000)}`
      }
    };
  }

  async analyzeDocumentStructure(content, provider, apiKey, customUrl, customModel, onProgress) {
    const messages = [
      {
        role: 'system',
        content: this.analysisTemplates.structure.systemPrompt
      },
      {
        role: 'user',
        content: this.analysisTemplates.structure.userPrompt(content)
      }
    ];

    let analysisResult = '';
    let tokenUsage = null;
    
    if (onProgress) {
      const streamResult = await aiService.callAIStream(
        provider, 
        apiKey, 
        messages, 
        (chunk) => {
          onProgress({ stage: 'structure', chunk });
        },
        customUrl,
        customModel
      );
      analysisResult = streamResult.content;
      tokenUsage = streamResult.tokenUsage;
    } else {
      const aiResult = await this.callAISync(provider, apiKey, messages, customUrl, customModel);
      analysisResult = aiResult.content;
      tokenUsage = aiResult.tokenUsage;
    }

    return {
      analysis: analysisResult,
      summary: this.extractSummary(analysisResult),
      tokenUsage: tokenUsage,
      timestamp: new Date().toISOString()
    };
  }

  async analyzeDesign(content, provider, apiKey, customUrl, customModel, onProgress) {
    const messages = [
      {
        role: 'system',
        content: this.analysisTemplates.design.systemPrompt
      },
      {
        role: 'user',
        content: this.analysisTemplates.design.userPrompt(content)
      }
    ];

    let analysisResult = '';
    let tokenUsage = null;
    
    if (onProgress) {
      const streamResult = await aiService.callAIStream(
        provider, 
        apiKey, 
        messages, 
        (chunk) => {
          onProgress({ stage: 'design', chunk });
        },
        customUrl,
        customModel
      );
      analysisResult = streamResult.content;
      tokenUsage = streamResult.tokenUsage;
    } else {
      const aiResult = await this.callAISync(provider, apiKey, messages, customUrl, customModel);
      analysisResult = aiResult.content;
      tokenUsage = aiResult.tokenUsage;
    }

    return {
      analysis: analysisResult,
      issues: this.extractIssues(analysisResult),
      recommendations: this.extractRecommendations(analysisResult),
      tokenUsage: tokenUsage,
      timestamp: new Date().toISOString()
    };
  }

  async analyzeLogic(content, provider, apiKey, customUrl, customModel, onProgress) {
    const messages = [
      {
        role: 'system',
        content: this.analysisTemplates.logic.systemPrompt
      },
      {
        role: 'user',
        content: this.analysisTemplates.logic.userPrompt(content)
      }
    ];

    let analysisResult = '';
    let tokenUsage = null;
    
    if (onProgress) {
      const streamResult = await aiService.callAIStream(
        provider, 
        apiKey, 
        messages, 
        (chunk) => {
          onProgress({ stage: 'logic', chunk });
        },
        customUrl,
        customModel
      );
      analysisResult = streamResult.content;
      tokenUsage = streamResult.tokenUsage;
    } else {
      const aiResult = await this.callAISync(provider, apiKey, messages, customUrl, customModel);
      analysisResult = aiResult.content;
      tokenUsage = aiResult.tokenUsage;
    }

    return {
      analysis: analysisResult,
      inconsistencies: this.extractInconsistencies(analysisResult),
      corrections: this.extractCorrections(analysisResult),
      tokenUsage: tokenUsage,
      timestamp: new Date().toISOString()
    };
  }

  async analyzeRisk(content, provider, apiKey, customUrl, customModel, onProgress) {
    const messages = [
      {
        role: 'system',
        content: this.analysisTemplates.risk.systemPrompt
      },
      {
        role: 'user',
        content: this.analysisTemplates.risk.userPrompt(content)
      }
    ];

    let analysisResult = '';
    let tokenUsage = null;
    
    if (onProgress) {
      const streamResult = await aiService.callAIStream(
        provider, 
        apiKey, 
        messages, 
        (chunk) => {
          onProgress({ stage: 'risk', chunk });
        },
        customUrl,
        customModel
      );
      analysisResult = streamResult.content;
      tokenUsage = streamResult.tokenUsage;
    } else {
      const aiResult = await this.callAISync(provider, apiKey, messages, customUrl, customModel);
      analysisResult = aiResult.content;
      tokenUsage = aiResult.tokenUsage;
    }

    return {
      analysis: analysisResult,
      riskLevel: this.extractRiskLevel(analysisResult),
      mitigation: this.extractMitigation(analysisResult),
      tokenUsage: tokenUsage,
      timestamp: new Date().toISOString()
    };
  }

  async callAISync(provider, apiKey, messages, customUrl, customModel, onLog) {
    let result;
    
    const logData = {
      type: 'ai_call',
      action: 'start',
      provider,
      customUrl: customUrl ? '已配置' : '未配置',
      customModel: customModel ? customModel : '默认模型',
      messagesCount: messages.length,
      totalPromptLength: messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0),
      timestamp: new Date().toISOString()
    };
    
    console.log(`开始调用AI服务: ${provider}`, logData);
    if (onLog) {
      onLog(logData);
    }
    
    try {
      switch (provider) {
        case 'openai':
          result = await aiService.callOpenAI(messages, 4000, apiKey, customUrl, customModel);
          break;
        case 'deepseek':
          result = await aiService.callDeepSeek(messages, 4000, apiKey, customUrl, customModel);
          break;
        case 'custom':
          result = await aiService.callCustomAPI(messages, 4000, apiKey, customUrl, customModel);
          break;
        default:
          throw new Error(`不支持的AI提供商: ${provider}`);
      }
      
      const successLog = {
        type: 'ai_call',
        action: 'success',
        provider,
        tokenUsage: result.tokenUsage,
        timestamp: new Date().toISOString()
      };
      
      console.log(`AI服务调用成功: ${provider}`, successLog);
      if (onLog) {
        onLog(successLog);
      }
      
      // 返回处理结果，包含token使用数据
      return result;
    } catch (error) {
      const errorLog = {
        type: 'ai_call',
        action: 'error',
        provider,
        errorMessage: error.message,
        errorStack: error.stack,
        response: error.response?.data || '无响应数据',
        timestamp: new Date().toISOString()
      };
      
      console.error(`AI服务调用失败: ${provider}`, errorLog);
      if (onLog) {
        onLog(errorLog);
      }
      
      // 重新抛出错误，让调用者处理
      throw error;
    }
  }

  extractSummary(analysis) {
    const lines = analysis.split('\n');
    const summaryLines = lines.slice(0, 5).filter(line => line.trim());
    return summaryLines.join('\n');
  }

  extractIssues(analysis) {
    const issues = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('问题') || line.includes('缺陷') || line.includes('不足')) {
        const cleanLine = line.replace(/^[\d\-\.\s]*/, '').trim();
        if (cleanLine && cleanLine.length > 10) {
          issues.push(cleanLine);
        }
      }
    }
    
    return issues.slice(0, 10);
  }

  extractRecommendations(analysis) {
    const recommendations = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('建议') || line.includes('改进') || line.includes('优化')) {
        const cleanLine = line.replace(/^[\d\-\.\s]*/, '').trim();
        if (cleanLine && cleanLine.length > 10) {
          recommendations.push(cleanLine);
        }
      }
    }
    
    return recommendations.slice(0, 10);
  }

  extractInconsistencies(analysis) {
    const inconsistencies = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('不一致') || line.includes('矛盾') || line.includes('冲突')) {
        const cleanLine = line.replace(/^[\d\-\.\s]*/, '').trim();
        if (cleanLine && cleanLine.length > 10) {
          inconsistencies.push(cleanLine);
        }
      }
    }
    
    return inconsistencies.slice(0, 10);
  }

  extractCorrections(analysis) {
    const corrections = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('修正') || line.includes('调整') || line.includes('修改')) {
        const cleanLine = line.replace(/^[\d\-\.\s]*/, '').trim();
        if (cleanLine && cleanLine.length > 10) {
          corrections.push(cleanLine);
        }
      }
    }
    
    return corrections.slice(0, 10);
  }

  extractRiskLevel(analysis) {
    const riskKeywords = {
      '高': 3,
      '中': 2,
      '低': 1,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    const lines = analysis.split('\n');
    for (const line of lines) {
      for (const [keyword, level] of Object.entries(riskKeywords)) {
        if (line.toLowerCase().includes(keyword)) {
          return level;
        }
      }
    }
    
    return 2;
  }

  extractMitigation(analysis) {
    const mitigation = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('缓解') || line.includes('应对') || line.includes('防范')) {
        const cleanLine = line.replace(/^[\d\-\.\s]*/, '').trim();
        if (cleanLine && cleanLine.length > 10) {
          mitigation.push(cleanLine);
        }
      }
    }
    
    return mitigation.slice(0, 5);
  }

  async processPDFContent(pdfBuffer) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(pdfBuffer);
      
      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      throw new Error(`PDF解析失败: ${error.message}`);
    }
  }

  async generateComprehensiveSummary(analysisResults, provider, apiKey, customUrl, customModel, onLog) {
    try {
      // 提取各阶段的分析结果和评分
      const structureResult = analysisResults.structure?.analysis || '';
      const designResult = analysisResults.design?.analysis || '';
      const logicResult = analysisResults.logic?.analysis || '';
      const riskResult = analysisResults.risk?.analysis || '';

      // 生成当前日期和报告编号
      const currentDate = new Date();
      const reportDate = currentDate.toISOString().split('T')[0];
      const reportNumber = `DOC-ANALYSIS-${reportDate.replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // 进一步优化提示词，减少长度，提高成功率
      const summaryPrompt = `请根据以下各维度的分析结果，生成一份适合PDF格式的完整分析报告。

文档结构分析：
${structureResult.substring(0, 300)}...

设计缺陷检查：
${designResult.substring(0, 300)}...

逻辑一致性分析：
${logicResult.substring(0, 300)}...

风险评估：
${riskResult.substring(0, 300)}...

要求：
1. 只生成报告正文内容，不要添加任何额外的开场白或结束语
2. 不要包含类似"好的,作为专业的文档分析专家..."这样的开场白
3. 不要包含类似"**报告生成完毕**"这样的结束语
4. 直接开始报告内容，从标题开始
5. 生成一份完整的分析报告，包含标题、摘要、主要发现和建议
6. 报告结构清晰，层次分明
7. 语言专业、准确，详细描述各维度的分析结果
8. 包含总体评价和具体建议
9. 适合直接用于PDF生成
10. 报告头部必须包含以下信息，并且信息必须正确：
   - 报告编号：${reportNumber}
   - 分析日期：${new Date().toLocaleDateString('zh-CN')}
   - 分析专家：AI产品文档审查系统
11. 绝对不要使用错误的日期（如2024年5月）或固定编号（如DOC-ANALYSIS-2024-001）
12. 不要使用"文档分析专家组"这样的错误专家信息`;

      const messages = [
        {
          role: 'system',
          content: '你是一个专业的文档分析专家，请根据各维度的分析结果生成一份完整、专业的分析报告，适合直接用于PDF格式输出。请注意：1. 只生成报告正文内容，不要添加任何额外的开场白或结束语；2. 不要包含类似"好的,作为专业的文档分析专家..."这样的开场白；3. 不要包含类似"**报告生成完毕**"这样的结束语；4. 直接开始报告内容，从标题开始；5. 报告必须格式规范，适合直接用于PDF生成。'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ];

      // 添加超时处理，增加超时时间
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('生成综合总结超时')), 120000); // 120秒超时
      });

      // 使用Promise.race添加超时机制
      const aiResult = await Promise.race([
        this.callAISync(provider, apiKey, messages, customUrl, customModel, onLog),
        timeoutPromise
      ]);

      return {
        summary: aiResult.content,
        tokenUsage: aiResult.tokenUsage
      };
    } catch (error) {
      const errorLog = {
        type: 'summary_generation',
        action: 'error',
        provider,
        errorMessage: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      console.error('生成综合总结失败:', errorLog);
      if (onLog) {
        onLog(errorLog);
      }
      
      // 回退机制：基于现有分析结果生成简单总结
      const structureResult = analysisResults.structure?.analysis || '';
      const designResult = analysisResults.design?.analysis || '';
      const logicResult = analysisResults.logic?.analysis || '';
      const riskResult = analysisResults.risk?.analysis || '';
      
      // 提取各阶段的关键信息
      const structureSummary = this.extractSummary(structureResult);
      const designSummary = this.extractSummary(designResult);
      const logicSummary = this.extractSummary(logicResult);
      const riskSummary = this.extractSummary(riskResult);
      
      // 生成基于现有结果的简单总结
      const fallbackSummary = `# 文档分析报告

## 摘要

由于AI服务调用问题，无法生成完整的综合分析报告。以下是各维度分析的关键发现：

## 文档结构分析
${structureSummary}

## 设计缺陷检查
${designSummary}

## 逻辑一致性分析
${logicSummary}

## 风险评估
${riskSummary}

## 总体评价

文档分析已完成，各维度分析结果如上所示。虽然无法生成完整的综合报告，但从各维度分析结果可以看出文档的整体质量和需要改进的方向。

## 建议

1. 根据各维度分析结果，针对性地改进文档内容
2. 检查AI服务配置，确保API密钥和网络连接正常
3. 考虑增加超时时间或调整AI服务参数
4. 尝试重新分析文档，生成完整的综合报告`;
      
      // 返回回退生成的总结
      return {
        summary: fallbackSummary,
        tokenUsage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total: 0
        }
      };
    }
  }
}

module.exports = new DocumentProcessor();