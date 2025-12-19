const axios = require('axios');
const { StringDecoder } = require('string_decoder');

class AIService {
  constructor() {
    this.providers = {
      openai: {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4o-mini'
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
      }
    };
  }

  async executeWithRetry(fn, maxRetries = 3, retryDelay = 2000, providerName = 'API') {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        console.log(`${providerName}调用失败，正在重试 (${retries}/${maxRetries})...`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async callOpenAI(messages, maxTokens = 4000, apiKey, customUrl, customModel) {
    const url = customUrl || this.providers.openai.baseUrl;
    const model = customModel || this.providers.openai.defaultModel;
    
    return this.executeWithRetry(async () => {
      const response = await axios.post(url, {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return {
        content: response.data.choices[0].message.content,
        tokenUsage: {
          prompt_tokens: response.data.usage.prompt_tokens,
          completion_tokens: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens
        }
      };
    }, 3, 2000, 'OpenAI');
  }

  async callDeepSeek(messages, maxTokens = 4000, apiKey, customUrl, customModel) {
    const url = customUrl || this.providers.deepseek.baseUrl;
    const model = customModel || this.providers.deepseek.defaultModel;
    
    return this.executeWithRetry(async () => {
      const response = await axios.post(url, {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return {
        content: response.data.choices[0].message.content,
        tokenUsage: {
          prompt_tokens: response.data.usage.prompt_tokens,
          completion_tokens: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens
        }
      };
    }, 3, 2000, 'DeepSeek');
  }

  async callCustomAPI(messages, maxTokens, apiKey, customUrl, customModel) {
    return this.executeWithRetry(async () => {
      const response = await axios.post(customUrl, {
        model: customModel,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return {
        content: response.data.choices[0].message.content,
        tokenUsage: {
          prompt_tokens: response.data.usage?.prompt_tokens || 0,
          completion_tokens: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0
        }
      };
    }, 3, 2000, '自定义API');
  }

  async callAIStream(provider, apiKey, messages, onProgress, customUrl, customModel) {
    const providers = {
      openai: {
        url: customUrl || this.providers.openai.baseUrl,
        model: customModel || this.providers.openai.defaultModel,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      deepseek: {
        url: customUrl || this.providers.deepseek.baseUrl,
        model: customModel || this.providers.deepseek.defaultModel,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      custom: {
        url: customUrl,
        model: customModel,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    };

    const config = providers[provider];
    if (!config || !config.url) {
      throw new Error(`不支持的AI提供商: ${provider}`);
    }

    const requestData = {
      model: config.model,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.3,
      stream: true
    };

    try {
      const response = await axios.post(config.url, requestData, {
        headers: config.headers,
        responseType: 'stream',
        timeout: 60000
      });

      let fullContent = '';
      let tokenUsage = null;
      let buffer = '';
      const decoder = new StringDecoder('utf8');

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          buffer += decoder.write(chunk);
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                
                // 检查是否有token使用数据（在完成时返回）
                if (data.usage) {
                  tokenUsage = {
                    prompt_tokens: data.usage.prompt_tokens,
                    completion_tokens: data.usage.completion_tokens,
                    total: data.usage.total_tokens
                  };
                }
                
                // 处理内容流
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                  const content = data.choices[0].delta.content;
                  if (content) {
                    fullContent += content;
                    if (onProgress) {
                      onProgress(content);
                    }
                  }
                }
              } catch (e) {
                console.warn('解析流数据错误:', e.message);
              }
            }
          }
        });

        response.data.on('end', () => {
          // 返回包含内容和token使用数据的对象
          resolve({
            content: fullContent,
            tokenUsage: tokenUsage
          });
        });

        response.data.on('error', (error) => {
          reject(new Error(`AI流式响应错误: ${error.message}`));
        });
      });

    } catch (error) {
      if (error.response) {
        throw new Error(`AI服务错误: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('无法连接到AI服务，请检查网络连接');
      } else {
        throw new Error(`AI服务调用错误: ${error.message}`);
      }
    }
  }

  async validateAPIKey(provider, apiKey, customUrl) {
    const testMessages = [
      {
        role: 'user',
        content: '请回复"测试成功"'
      }
    ];

    try {
      let result;
      switch (provider) {
        case 'openai':
          result = await this.callOpenAI(testMessages, 10, apiKey, customUrl);
          break;
        case 'deepseek':
          result = await this.callDeepSeek(testMessages, 10, apiKey, customUrl);
          break;
        case 'custom':
          if (!customUrl) {
            throw new Error('自定义API需要提供URL');
          }
          result = await this.callCustomAPI(testMessages, 10, apiKey, customUrl);
          break;
        default:
          throw new Error(`不支持的提供商: ${provider}`);
      }

      return result && result.content && result.content.includes('测试成功');
    } catch (error) {
      console.error('API密钥验证失败:', error.message);
      return false;
    }
  }
}

module.exports = new AIService();