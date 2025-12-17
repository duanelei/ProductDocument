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

${content.substring(0, 8000)}`
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

${content.substring(0, 8000)}`
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

${content.substring(0, 8000)}`
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

${content.substring(0, 8000)}`
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

  async callAISync(provider, apiKey, messages, customUrl, customModel) {
    let result;
    
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
    
    // 返回处理结果，包含token使用数据
    return result;
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

  async generateComprehensiveSummary(analysisResults, provider, apiKey, customUrl, customModel) {
    // 提取各阶段的分析结果和评分
    const structureResult = analysisResults.structure?.analysis || '';
    const designResult = analysisResults.design?.analysis || '';
    const logicResult = analysisResults.logic?.analysis || '';
    const riskResult = analysisResults.risk?.analysis || '';

    const summaryPrompt = `请根据以下各维度的分析结果，生成一个简洁的综合总结（不超过200字），包括主要发现和总体评价：

文档结构分析：
${structureResult}

设计缺陷检查：
${designResult}

逻辑一致性分析：
${logicResult}

风险评估：
${riskResult}

要求：
1. 直接输出总结，不要添加任何开场白或介绍性文字
2. 语言简洁明了，突出重点
3. 包含总体评价和主要发现
4. 不超过200字`;

    const messages = [
      {
        role: 'system',
        content: '你是一个专业的文档分析专家，请根据各维度的分析结果生成简洁的综合总结。'
      },
      {
        role: 'user',
        content: summaryPrompt
      }
    ];

    const aiResult = await this.callAISync(provider, apiKey, messages, customUrl, customModel);
    return {
      summary: aiResult.content,
      tokenUsage: aiResult.tokenUsage
    };
  }
}

module.exports = new DocumentProcessor();