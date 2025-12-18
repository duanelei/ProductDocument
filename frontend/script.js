class DocumentReviewSystem {
    constructor() {
        this.currentFile = null;
        this.currentFileId = null;
        this.analysisSession = null;
        this.isAnalyzing = false;
        this.eventSource = null;
        this.tokenCount = 0;
        this.tokenCost = 0;
        this.tokenRate = 0.00000105; // 正确的每token费用：¥0.00000105 (GPT-4o-mini，按1美元=7人民币计算)
        
        this.initializeEventListeners();
        this.loadConfigFromStorage();
    }

    initializeEventListeners() {
        // AI服务提供商切换
        document.getElementById('provider').addEventListener('change', (e) => {
            this.toggleCustomConfig(e.target.value === 'custom');
        });

        // API测试连接
        document.getElementById('testApi').addEventListener('click', () => {
            this.testApiConnection();
        });

        // 文件上传处理
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // 分析控制按钮
        document.getElementById('startAnalysis').addEventListener('click', () => {
            this.startAnalysis();
        });

        document.getElementById('continueAnalysis').addEventListener('click', () => {
            this.continueAnalysis();
        });

        document.getElementById('stopAnalysis').addEventListener('click', () => {
            this.stopAnalysis();
        });

        // 可点击的进度阶段
        document.querySelectorAll('.stage.clickable').forEach(stage => {
            stage.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        // 导出功能
        document.getElementById('exportJson').addEventListener('click', () => {
            this.exportResults('json');
        });

        document.getElementById('exportPdf').addEventListener('click', () => {
            this.exportResults('pdf');
        });

        // 测试PDF生成按钮
        document.getElementById('testPdfGeneration').addEventListener('click', () => {
            this.mockAnalysisResults();
        });

        // 弹窗控制
        document.getElementById('confirmContinue').addEventListener('click', () => {
            this.hidePauseModal();
            this.continueAnalysis();
        });

        document.getElementById('cancelAnalysis').addEventListener('click', () => {
            this.hidePauseModal();
            this.resetAnalysis();
        });

        document.getElementById('closeError').addEventListener('click', () => {
            this.hideErrorModal();
        });

        // 配置保存
        document.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('change', () => {
                this.saveConfigToStorage();
            });
        });
    }

    toggleCustomConfig(show) {
        const customConfig = document.getElementById('customConfig');
        customConfig.style.display = show ? 'block' : 'none';
    }

    async testApiConnection() {
        const provider = document.getElementById('provider').value;
        const apiKey = document.getElementById('apiKey').value;
        const customApiUrl = document.getElementById('customApiUrl').value;

        if (!apiKey) {
            this.showError('请输入API密钥');
            return;
        }

        const testBtn = document.getElementById('testApi');
        const originalText = testBtn.textContent;
        testBtn.innerHTML = '<span class="loading"></span>测试中...';
        testBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3001/api/health');
            if (!response.ok) {
                throw new Error('后端服务不可用');
            }

            // 这里可以添加实际的API密钥验证逻辑
            // 暂时模拟成功
            this.showSuccess('API连接测试成功！');
        } catch (error) {
            this.showError(`连接测试失败: ${error.message}`);
        } finally {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }
    }

    async handleFileSelect(file) {
        if (file.type !== 'application/pdf') {
            this.showError('请选择PDF文件');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showError('文件大小不能超过10MB');
            return;
        }

        this.currentFile = file;
        
        // 显示文件信息
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <strong>文件名:</strong> ${file.name}<br>
            <strong>大小:</strong> ${this.formatFileSize(file.size)}<br>
            <strong>类型:</strong> ${file.type}
        `;

        // 显示分析控制区域
        document.getElementById('controlSection').style.display = 'block';
        
        // 读取文件内容为ArrayBuffer，准备发送给后端
        const fileArrayBuffer = await this.readFileAsArrayBuffer(file);
        this.currentFileArrayBuffer = fileArrayBuffer;
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async startAnalysis() {
        if (!this.validateConfig()) return;

        this.isAnalyzing = true;
        this.updateUIForAnalysisStart();

        const config = this.getConfig();
        // 保存this上下文，确保在回调中可用
        const analyzerInstance = this;

        try {
            // 将ArrayBuffer转换为Base64字符串
            const base64Content = this.arrayBufferToBase64(this.currentFileArrayBuffer);
            
            // 发送分析请求并处理流式响应
            const response = await fetch('http://localhost:3001/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...config,
                    fileContent: base64Content,
                    fileName: this.currentFile.name
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // 处理所有完整的SSE消息
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
                    const message = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 2);
                    
                    if (message.startsWith('data: ')) {
                        const dataStr = message.slice(6);
                        try {
                            const data = JSON.parse(dataStr);
                            analyzerInstance.handleStreamData(data);
                        } catch (e) {
                            console.error('解析SSE消息失败:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('分析错误:', error);
            analyzerInstance.showError(`分析失败: ${error.message}`);
            analyzerInstance.stopAnalysis();
        }
    }
    
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async continueAnalysis() {
        if (!this.validateConfig()) return;

        this.isAnalyzing = true;
        this.updateUIForAnalysisContinue();

        const config = this.getConfig();
        // 保存this上下文，确保在回调中可用
        const analyzerInstance = this;

        try {
            // 发送继续分析请求并处理流式响应
            const response = await fetch('http://localhost:3001/api/analyze/continue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...config,
                    fileId: this.currentFileId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // 处理所有完整的SSE消息
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
                    const message = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 2);
                    
                    if (message.startsWith('data: ')) {
                        const dataStr = message.slice(6);
                        try {
                            const data = JSON.parse(dataStr);
                            analyzerInstance.handleStreamData(data);
                        } catch (e) {
                            console.error('解析SSE消息失败:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('继续分析错误:', error);
            analyzerInstance.showError(`继续分析失败: ${error.message}`);
            analyzerInstance.stopAnalysis();
        }
    }

    stopAnalysis() {
        this.isAnalyzing = false;
        
        // 不再使用EventSource，移除相关代码
        this.updateUIForAnalysisStop();
    }

    hidePauseModal() {
        document.getElementById('pauseModal').style.display = 'none';
    }

    handleAnalysisComplete(results) {
        this.isAnalyzing = false;
        this.analysisSession = results;
        
        // 更新所有阶段状态，包括综合总结
        ['structure', 'design', 'logic', 'risk', 'summary'].forEach(stage => {
            this.updateStageProgress(stage, '已完成');
        });
        
        this.updateProgressBar('complete');
        document.getElementById('progressText').textContent = '分析完成！';
        
        // 填充结果内容
        this.displayResults(results);
        
        // 专门处理综合总结，确保它被显示
        if (this.analysisSession && this.analysisSession.comprehensiveSummary) {
            this.displayComprehensiveSummary(this.analysisSession.comprehensiveSummary);
        }
        
        this.showSuccess('文档分析完成！');
    }

    handleStreamData(data) {
        console.log('收到流数据:', data);
        
        // 更新Token统计 - 只使用实际返回的token数据
        if (data.tokenUsage) {
            this.updateTokenStats(data.tokenUsage);
        }

        switch (data.stage) {
            case 'structure':
                // 如果有analysisResult，说明结构分析已完成
                if (data.structureAnalysis) {
                    this.updateStageProgress('structure', '已完成');
                    this.analysisSession = this.analysisSession || {};
                    this.analysisSession.structure = data.structureAnalysis;
                    this.updateResultContent('structure', data.structureAnalysis);
                    document.getElementById('analysisSection').style.display = 'block';
                } else {
                    // 否则是正在进行中
                    this.updateStageProgress('structure', '进行中');
                }
                this.appendToOutput(data.chunk || data.message);
                break;
                
            case 'paused':
                // 后端不再返回paused状态，保留此处理作为后备
                console.log('收到paused状态，但已配置为自动连续执行');
                break;
                
            case 'design':
                // 如果有analysisResult，说明设计分析已完成
                if (data.analysisResult) {
                    this.updateStageProgress('design', '已完成');
                    this.analysisSession = this.analysisSession || {};
                    this.analysisSession.design = data.analysisResult;
                    this.updateResultContent('design', data.analysisResult);
                    document.getElementById('analysisSection').style.display = 'block';
                } else {
                    // 否则是正在进行中
                    this.updateStageProgress('design', '进行中');
                }
                this.appendToOutput(data.chunk || data.message);
                break;
                
            case 'logic':
                // 如果有analysisResult，说明逻辑分析已完成
                if (data.analysisResult) {
                    this.updateStageProgress('logic', '已完成');
                    this.analysisSession = this.analysisSession || {};
                    this.analysisSession.logic = data.analysisResult;
                    this.updateResultContent('logic', data.analysisResult);
                    document.getElementById('analysisSection').style.display = 'block';
                } else {
                    // 否则是正在进行中
                    this.updateStageProgress('logic', '进行中');
                }
                this.appendToOutput(data.chunk || data.message);
                break;
                
            case 'risk':
                // 如果有analysisResult，说明风险评估已完成
                if (data.analysisResult) {
                    this.updateStageProgress('risk', '已完成');
                    this.analysisSession = this.analysisSession || {};
                    this.analysisSession.risk = data.analysisResult;
                    this.updateResultContent('risk', data.analysisResult);
                    document.getElementById('analysisSection').style.display = 'block';
                } else {
                    // 否则是正在进行中
                    this.updateStageProgress('risk', '进行中');
                }
                this.appendToOutput(data.chunk || data.message);
                break;
                

            case 'complete':
                // 分析完成时，使用准确的总Token数据，避免重复计算
                if (data.totalTokenUsage) {
                    // 重置tokenCount，然后只使用总token值
                    this.tokenCount = 0;
                    this.tokenCost = 0;
                    this.updateTokenStats(data.totalTokenUsage);
                }
                
                // 保存综合总结
                this.analysisSession = data.data;
                if (data.comprehensiveSummary) {
                    this.analysisSession.comprehensiveSummary = data.comprehensiveSummary;
                }
                
                // 直接调用handleAnalysisComplete，传入完整的分析数据
                this.handleAnalysisComplete(this.analysisSession);
                break;
        }

        this.updateProgressBar(data.stage);
    }
    


    updateProgressBar(stage) {
        let progress = 0;
        
        // 根据当前阶段设置正确的进度百分比
        switch(stage) {
            case 'structure':
                progress = 0;
                break;
            case 'design':
                progress = 25;
                break;
            case 'logic':
                progress = 50;
                break;
            case 'risk':
                progress = 75;
                break;
            case 'complete':
                progress = 100;
                break;
            default:
                progress = 0;
        }
        
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = 
            `分析进度: ${Math.round(progress)}% - ${this.getStageName(stage)}`;
    }

    getStageName(stage) {
        const names = {
            structure: '文档结构分析',
            design: '设计缺陷检查',
            logic: '逻辑一致性分析',
            risk: '风险评估',
            summary: '综合总结',
            paused: '暂停确认',
            complete: '分析完成'
        };
        return names[stage] || stage;
    }

    updateStageProgress(stage, status) {
        const element = document.getElementById(`stage${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
        const statusElement = document.getElementById(`status${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
        
        element.classList.remove('active', 'completed');
        statusElement.textContent = status;
        
        if (status === '进行中') {
            element.classList.add('active');
        } else if (status === '已完成') {
            element.classList.add('completed');
        }
    }

    appendToOutput(content) {
        const outputContent = document.getElementById('outputContent');
        outputContent.textContent += content;
        outputContent.scrollTop = outputContent.scrollHeight;
    }

    showPauseModal(analysisResult, completedStage) {
        const previewElement = document.getElementById('structurePreview');
        const modalTitle = document.getElementById('pauseModalTitle');
        
        // 更新模态框标题和预览内容
        if (completedStage && analysisResult) {
            modalTitle.textContent = `${this.getStageName(completedStage)}完成`;
            previewElement.textContent = 
                analysisResult?.summary || analysisResult?.analysis || `${this.getStageName(completedStage)}完成`;
        } else {
            modalTitle.textContent = '分析暂停';
            previewElement.textContent = '分析已暂停，请确认后继续';
        }
        
        document.getElementById('pauseModal').style.display = 'flex';
        this.stopAnalysis();
    }
    
    // 添加一个测试方法来模拟分析结果，用于测试PDF生成
    mockAnalysisResults() {
        this.analysisSession = {
            comprehensiveSummary: "这是一个综合总结的示例文本。测试中文编码是否正常显示。",
            structure: {
                analysis: "1. 文档结构分析结果示例\n\n文档标题明确，结构清晰，包含了产品概述、功能需求、技术规格等重要章节。\n\n2. 章节组织\n\n章节之间逻辑关系合理，遵循了从宏观到微观的描述顺序。\n\n5. 综合评分：8.5"
            },
            design: {
                analysis: "1. 设计缺陷检查结果示例\n\n设计方案整体合理，但存在一些可以改进的地方。\n\n2. 设计亮点\n\n采用了模块化设计，便于后续扩展和维护。\n\n5. 综合评分：8.0"
            },
            logic: {
                analysis: "1. 逻辑一致性分析结果示例\n\n文档中的逻辑关系总体一致，但存在少量前后矛盾的地方。\n\n2. 逻辑关系\n\n功能需求与技术规格之间的映射关系清晰。\n\n5. 综合评分：8.2"
            },
            risk: {
                analysis: "1. 风险评估结果示例\n\n识别出了一些潜在风险，但都有相应的缓解措施。\n\n2. 主要风险\n\n市场风险、技术风险和进度风险是需要重点关注的领域。\n\n5. 综合评分：8.3"
            }
        };
        // 更新阶段状态
        this.updateStageProgress('structure', '已完成');
        this.updateStageProgress('design', '已完成');
        this.updateStageProgress('logic', '已完成');
        this.updateStageProgress('risk', '已完成');
        this.updateStageProgress('summary', '已完成');
        // 更新UI
        document.getElementById('analysisSection').style.display = 'block';
        this.showSuccess('模拟分析结果已生成，可以测试PDF导出功能');
    }

    hidePauseModal() {
        document.getElementById('pauseModal').style.display = 'none';
    }

    displayResults(results) {
        if (results.structure) {
            this.updateResultContent('structure', results.structure);
        }
        
        if (results.design) {
            this.updateResultContent('design', results.design);
        }
        
        if (results.logic) {
            this.updateResultContent('logic', results.logic);
        }
        
        if (results.risk) {
            this.updateResultContent('risk', results.risk);
        }
        
        // 显示综合总结 - 同时检查results和this.analysisSession
        const summary = results.comprehensiveSummary || (this.analysisSession && this.analysisSession.comprehensiveSummary);
        if (summary) {
            this.displayComprehensiveSummary(summary);
        }
    }
    
    updateResultContent(stage, result) {
        if (!result) return;
        
        const resultElement = document.getElementById(`result${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
        if (resultElement) {
            resultElement.innerHTML = this.formatResultContent(result.analysis || result.summary || JSON.stringify(result, null, 2));
        }
        
        // 更新阶段状态指示器
        const tabBtn = document.querySelector(`[data-tab="${stage}"]`);
        if (tabBtn) {
            tabBtn.classList.add('completed');
        }
    }

    formatResultContent(content) {
        // 先将换行符替换为<br>
        let formattedContent = content.replace(/\n/g, '<br>');
        
        // 将数字列表项加粗
        formattedContent = formattedContent.replace(/\d+\./g, '<strong>$&</strong>');
        
        // 突出显示评分部分
        formattedContent = formattedContent.replace(/(5\.\s*综合评分\s*：?\s*[0-9]+(\.[0-9]+)?)分?/gi, '<div class="rating-section"><strong>$1分</strong></div>');
        formattedContent = formattedContent.replace(/(5\.\s*综合评分\s*：?\s*[0-9]+(\.[0-9]+)?)\s*分?/gi, '<div class="rating-section"><strong>$1分</strong></div>');
        
        // 突出显示评分标题
        formattedContent = formattedContent.replace(/(5\.\s*综合评分)/gi, '<strong>$1</strong>');
        
        return formattedContent;
    }
    
    switchTab(tabName) {
        // 更新阶段状态指示器
        document.querySelectorAll('.stage').forEach(stage => {
            stage.classList.remove('active');
        });
        
        // 高亮当前选中的阶段
        const stageElement = document.getElementById(`stage${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (stageElement) {
            stageElement.classList.add('active');
        }
        
        // 更新标签内容
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // 获取阶段状态
        const stageStatus = document.getElementById(`status${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        
        // 移除之前的空白标签
        const existingBlankTab = document.querySelector('.blank-tab');
        if (existingBlankTab) {
            existingBlankTab.remove();
        }
        
        // 处理不同状态
        if (stageStatus && stageStatus.textContent === '等待开始') {
            // 等待开始的标签，显示空白内容
            const blankTab = document.createElement('div');
            blankTab.className = 'tab-pane active blank-tab';
            blankTab.innerHTML = '<h3>该阶段尚未开始</h3><p>请等待前面的阶段完成后再查看此阶段结果。</p>';
            const tabContent = document.querySelector('.tab-content');
            tabContent.appendChild(blankTab);
        } else if (this.isAnalyzing && tabName !== 'realTime') {
            // 如果正在分析中且选择的不是实时输出
            if (stageStatus && stageStatus.textContent === '已完成') {
                // 阶段已完成，显示结果
                document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
            } else {
                // 阶段进行中，显示实时输出
                document.getElementById('tabRealTime').classList.add('active');
            }
        } else {
            // 不在分析中或选择的是实时输出
            document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
        }
    }
    
    // 更新Token统计
    updateTokenStats(usage) {
        if (!usage) return;
        
        // 获取本次要添加的token数量
        const tokenIncrease = usage.total || usage.prompt_tokens + usage.completion_tokens || 0;
        
        // 更新Token使用量
        this.tokenCount += tokenIncrease;
        
        // 计算费用
        this.tokenCost = this.tokenCount * this.tokenRate;
        
        // 更新UI
        document.getElementById('tokenCount').textContent = this.tokenCount.toLocaleString();
        document.getElementById('tokenCost').textContent = `¥${this.tokenCost.toFixed(4)}`;
    }

    exportResults(format) {
        if (!this.analysisSession) {
            this.showError('没有可导出的分析结果');
            return;
        }

        if (format === 'json') {
            const dataStr = JSON.stringify(this.analysisSession, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            this.downloadFile(dataBlob, 'analysis-results.json');
        } else if (format === 'pdf') {
            this.generatePDF();
        }
    }

    async generatePDF() {
        try {
            // 显示生成中提示
            this.showNotification('正在生成PDF报告...', 'success');
            
            // 导入jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // 页面尺寸和边距设置 - 加大上下边距
            const pageWidth = 210; // A4宽度，单位mm
            const pageHeight = 297; // A4高度，单位mm
            const marginLeftRight = 20; // 左右边距，单位mm
            const marginTopBottom = 30; // 上下边距，单位mm（加大到30mm）
            const contentWidth = pageWidth - 2 * marginLeftRight;
            const contentHeight = pageHeight - 2 * marginTopBottom;
            
            let currentY = marginTopBottom; // 当前Y坐标
            let pageNum = 1;
            
            // 创建一个临时容器来计算文本高度
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = `${contentWidth * 3.78}px`; // 转换为px，1mm = 3.78px
            tempContainer.style.fontFamily = 'SimSun, Arial, sans-serif';
            tempContainer.style.fontSize = '12px';
            tempContainer.style.lineHeight = '1.8';
            tempContainer.style.color = '#000000';
            document.body.appendChild(tempContainer);
            
            // 添加报告标题，使用上传的文件名称
            const fileName = this.currentFile ? this.currentFile.name.replace('.pdf', '') : '文档';
            const title = document.createElement('h1');
            title.textContent = `${fileName} - 审查报告`;
            title.style.textAlign = 'center';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '20px';
            title.style.fontFamily = 'SimSun, Arial, sans-serif';
            tempContainer.appendChild(title);
            
            // 计算标题高度并添加到PDF
            const titleHeight = title.offsetHeight / 3.78; // 转换为mm
            if (currentY + titleHeight > pageHeight - marginTopBottom) {
                pdf.addPage();
                currentY = marginTopBottom;
                pageNum++;
            }
            
            // 使用html2canvas生成标题图片
            const titleCanvas = await html2canvas(title, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            pdf.addImage(titleCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, titleHeight);
            currentY += titleHeight + 10;
            
            // 添加生成信息
            const infoText = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
            const infoEl = document.createElement('p');
            infoEl.textContent = infoText;
            infoEl.style.textAlign = 'center';
            infoEl.style.color = '#666';
            infoEl.style.fontSize = '10px';
            infoEl.style.fontFamily = 'SimSun, Arial, sans-serif';
            tempContainer.appendChild(infoEl);
            
            const infoHeight = infoEl.offsetHeight / 3.78;
            if (currentY + infoHeight > pageHeight - marginTopBottom) {
                pdf.addPage();
                currentY = marginTopBottom;
                pageNum++;
            }
            
            const infoCanvas = await html2canvas(infoEl, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            pdf.addImage(infoCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, infoHeight);
            currentY += infoHeight + 15;
            
            // 绘制分隔线
            pdf.setLineWidth(0.8);
            pdf.line(marginLeftRight, currentY, pageWidth - marginLeftRight, currentY);
            currentY += 15;
            
            // 辅助函数：添加章节到PDF
            const addChapterToPdf = async (chapterTitle, content) => {
                // 添加章节标题
                const chapterTitleEl = document.createElement('h2');
                chapterTitleEl.textContent = chapterTitle;
                chapterTitleEl.style.fontSize = '16px';
                chapterTitleEl.style.fontWeight = 'bold';
                chapterTitleEl.style.marginBottom = '15px';
                chapterTitleEl.style.fontFamily = 'SimSun, Arial, sans-serif';
                tempContainer.appendChild(chapterTitleEl);
                
                const chapterTitleHeight = chapterTitleEl.offsetHeight / 3.78;
                // 检查章节标题是否会超出当前页，添加足够的缓冲
                if (currentY + chapterTitleHeight + 20 > pageHeight - marginTopBottom) {
                    pdf.addPage();
                    currentY = marginTopBottom;
                    pageNum++;
                }
                
                const chapterTitleCanvas = await html2canvas(chapterTitleEl, {
                    scale: 1.5,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                pdf.addImage(chapterTitleCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, chapterTitleHeight);
                currentY += chapterTitleHeight + 10;
                
                // 处理内容，确保所有文本都使用SimSun字体
                let cleanContent = content;
                cleanContent = cleanContent.replace(/<[^>]*>/g, ''); // 移除HTML标签
                const paragraphs = cleanContent.split(/\n+/g); // 按换行符分割段落
                
                // 添加每个段落
                for (const paragraph of paragraphs) {
                    if (!paragraph.trim()) continue;
                    
                    // 创建段落元素并计算高度
                    const paraEl = document.createElement('p');
                    paraEl.textContent = paragraph;
                    paraEl.style.marginBottom = '10px';
                    paraEl.style.textIndent = '2em'; // 首行缩进2个汉字
                    paraEl.style.fontFamily = 'SimSun, Arial, sans-serif';
                    paraEl.style.fontSize = '12px';
                    paraEl.style.lineHeight = '1.8';
                    paraEl.style.textAlign = 'justify';
                    tempContainer.appendChild(paraEl);
                    
                    const paraHeight = paraEl.offsetHeight / 3.78;
                    
                    // 检查段落是否会超出当前页，添加足够的缓冲
                    if (currentY + paraHeight > pageHeight - marginTopBottom - 5) {
                        pdf.addPage();
                        currentY = marginTopBottom;
                        pageNum++;
                    }
                    
                    // 生成段落图片并添加到PDF
                    const paraCanvas = await html2canvas(paraEl, {
                        scale: 1.5,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    pdf.addImage(paraCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, paraHeight);
                    currentY += paraHeight + 8;
                }
            };
            
            // 直接使用AI生成的完整分析报告
            if (this.analysisSession.comprehensiveSummary) {
                // 不再分章节，直接使用AI生成的完整报告内容
                const fullReport = this.analysisSession.comprehensiveSummary;
                
                // 处理内容，确保所有文本都使用SimSun字体
                let cleanContent = fullReport;
                cleanContent = cleanContent.replace(/<[^>]*>/g, ''); // 移除HTML标签
                const paragraphs = cleanContent.split(/\n+/g); // 按换行符分割段落
                
                // 添加每个段落
                for (const paragraph of paragraphs) {
                    if (!paragraph.trim()) continue;
                    
                    // 创建段落元素并计算高度
                    const paraEl = document.createElement('p');
                    paraEl.textContent = paragraph;
                    paraEl.style.marginBottom = '10px';
                    paraEl.style.fontFamily = 'SimSun, Arial, sans-serif';
                    paraEl.style.fontSize = '12px';
                    paraEl.style.lineHeight = '1.8';
                    paraEl.style.textAlign = 'justify';
                    tempContainer.appendChild(paraEl);
                    
                    const paraHeight = paraEl.offsetHeight / 3.78;
                    
                    // 检查段落是否会超出当前页，添加足够的缓冲
                    if (currentY + paraHeight > pageHeight - marginTopBottom - 5) {
                        pdf.addPage();
                        currentY = marginTopBottom;
                        pageNum++;
                    }
                    
                    // 生成段落图片并添加到PDF
                    const paraCanvas = await html2canvas(paraEl, {
                        scale: 1.5,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    pdf.addImage(paraCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, paraHeight);
                    currentY += paraHeight + 8;
                }
            }
            
            // 添加附件：各阶段详细分析结果
            currentY += 20;
            
            // 检查是否需要新页面
            if (currentY > pageHeight - marginTopBottom - 50) {
                pdf.addPage();
                currentY = marginTopBottom;
                pageNum++;
            }
            
            // 添加附件标题
            const attachmentTitle = document.createElement('h2');
            attachmentTitle.textContent = '附件：各阶段详细分析结果';
            attachmentTitle.style.fontSize = '16px';
            attachmentTitle.style.fontWeight = 'bold';
            attachmentTitle.style.marginBottom = '15px';
            attachmentTitle.style.fontFamily = 'SimSun, Arial, sans-serif';
            tempContainer.appendChild(attachmentTitle);
            
            const attachmentTitleHeight = attachmentTitle.offsetHeight / 3.78;
            const attachmentTitleCanvas = await html2canvas(attachmentTitle, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            pdf.addImage(attachmentTitleCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, attachmentTitleHeight);
            currentY += attachmentTitleHeight + 15;
            
            // 定义阶段名称映射
            const stageNames = {
                structure: '文档结构分析',
                design: '设计缺陷检查',
                logic: '逻辑一致性分析',
                risk: '风险评估'
            };
            
            // 为每个阶段添加详细分析结果
            for (const [stage, stageName] of Object.entries(stageNames)) {
                if (this.analysisSession[stage]) {
                    // 检查是否需要新页面
                    if (currentY > pageHeight - marginTopBottom - 100) {
                        pdf.addPage();
                        currentY = marginTopBottom;
                        pageNum++;
                    }
                    
                    // 添加阶段标题
                    const stageTitle = document.createElement('h3');
                    stageTitle.textContent = stageName;
                    stageTitle.style.fontSize = '14px';
                    stageTitle.style.fontWeight = 'bold';
                    stageTitle.style.marginBottom = '10px';
                    stageTitle.style.fontFamily = 'SimSun, Arial, sans-serif';
                    tempContainer.appendChild(stageTitle);
                    
                    const stageTitleHeight = stageTitle.offsetHeight / 3.78;
                    const stageTitleCanvas = await html2canvas(stageTitle, {
                        scale: 1.5,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    pdf.addImage(stageTitleCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, stageTitleHeight);
                    currentY += stageTitleHeight + 10;
                    
                    // 获取阶段分析结果
                    const stageResult = this.analysisSession[stage].analysis;
                    
                    // 处理内容，确保所有文本都使用SimSun字体
                    let cleanStageResult = stageResult;
                    cleanStageResult = cleanStageResult.replace(/<[^>]*>/g, ''); // 移除HTML标签
                    const stageParagraphs = cleanStageResult.split(/\n+/g); // 按换行符分割段落
                    
                    // 添加每个段落
                    for (const paragraph of stageParagraphs) {
                        if (!paragraph.trim()) continue;
                        
                        // 创建段落元素并计算高度
                        const paraEl = document.createElement('p');
                        paraEl.textContent = paragraph;
                        paraEl.style.marginBottom = '10px';
                        paraEl.style.fontFamily = 'SimSun, Arial, sans-serif';
                        paraEl.style.fontSize = '11px'; // 附件内容使用稍小字体
                        paraEl.style.lineHeight = '1.8';
                        paraEl.style.textAlign = 'justify';
                        tempContainer.appendChild(paraEl);
                        
                        const paraHeight = paraEl.offsetHeight / 3.78;
                        
                        // 检查段落是否会超出当前页，添加足够的缓冲
                        if (currentY + paraHeight > pageHeight - marginTopBottom - 5) {
                            pdf.addPage();
                            currentY = marginTopBottom;
                            pageNum++;
                        }
                        
                        // 生成段落图片并添加到PDF
                        const paraCanvas = await html2canvas(paraEl, {
                            scale: 1.5,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff'
                        });
                        pdf.addImage(paraCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', marginLeftRight, currentY, contentWidth, paraHeight);
                        currentY += paraHeight + 8;
                    }
                    
                    // 阶段之间添加分隔
                    currentY += 20;
                }
            }
            
            // 使用报告名称作为PDF文件名
            const pdfFileName = `${fileName.replace(/\s+/g, '-')}-审查报告.pdf`;
            pdf.save(pdfFileName);
            
            // 清理临时元素
            document.body.removeChild(tempContainer);
            
            this.showSuccess('PDF报告生成成功！');
        } catch (error) {
            console.error('生成PDF失败:', error);
            this.showError('生成PDF失败，请重试');
            // 确保临时元素被清理
            const tempContainers = document.querySelectorAll('div[style*="left: -9999px"]');
            tempContainers.forEach(container => container.remove());
        }
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    validateConfig() {
        const provider = document.getElementById('provider').value;
        const apiKey = document.getElementById('apiKey').value;
        
        if (!apiKey) {
            this.showError('请输入API密钥');
            return false;
        }
        
        if (provider === 'custom') {
            const customApiUrl = document.getElementById('customApiUrl').value;
            if (!customApiUrl) {
                this.showError('请输入自定义API地址');
                return false;
            }
        }
        
        if (!this.currentFile) {
            this.showError('请先上传PDF文件');
            return false;
        }
        
        return true;
    }

    getConfig() {
        return {
            provider: document.getElementById('provider').value,
            apiKey: document.getElementById('apiKey').value,
            customApiUrl: document.getElementById('customApiUrl').value || undefined,
            customModel: document.getElementById('customModel').value || undefined
        };
    }

    updateUIForAnalysisStart() {
        document.getElementById('startAnalysis').style.display = 'none';
        document.getElementById('stopAnalysis').style.display = 'inline-block';
        document.getElementById('analysisSection').style.display = 'block';
        document.getElementById('outputContent').textContent = '';
    }

    updateUIForAnalysisContinue() {
        document.getElementById('continueAnalysis').style.display = 'none';
        document.getElementById('stopAnalysis').style.display = 'inline-block';
    }

    updateUIForAnalysisStop() {
        document.getElementById('stopAnalysis').style.display = 'none';
        
        if (this.currentFileId) {
            document.getElementById('continueAnalysis').style.display = 'inline-block';
        } else {
            document.getElementById('startAnalysis').style.display = 'inline-block';
        }
    }

    displayComprehensiveSummary(summary) {
        const resultElement = document.getElementById('resultSummary');
        if (resultElement) {
            resultElement.innerHTML = this.formatResultContent(summary);
        }
        
        // 更新综合总结阶段状态
        const tabBtn = document.querySelector(`[data-tab="summary"]`);
        if (tabBtn) {
            tabBtn.classList.add('completed');
        }
    }
    
    resetAnalysis() {
        this.currentFile = null;
        this.currentFileId = null;
        this.analysisSession = null;
        this.isAnalyzing = false;
        
        document.getElementById('fileInfo').innerHTML = '';
        document.getElementById('controlSection').style.display = 'none';
        document.getElementById('analysisSection').style.display = 'none';
        
        // 重置所有阶段状态，包括综合总结
        ['structure', 'design', 'logic', 'risk', 'summary'].forEach(stage => {
            this.updateStageProgress(stage, '等待开始');
        });
        
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '准备开始分析...';
        
        // 重置标签页状态
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById('tabRealTime').classList.add('active');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').style.display = 'flex';
    }

    hideErrorModal() {
        document.getElementById('errorModal').style.display = 'none';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `${type}-message`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    loadConfigFromStorage() {
        const savedConfig = localStorage.getItem('aiDocumentReviewConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            document.getElementById('provider').value = config.provider || 'openai';
            document.getElementById('apiKey').value = config.apiKey || '';
            document.getElementById('customApiUrl').value = config.customApiUrl || '';
            document.getElementById('customModel').value = config.customModel || '';
            
            this.toggleCustomConfig(config.provider === 'custom');
        }
    }

    saveConfigToStorage() {
        const config = this.getConfig();
        localStorage.setItem('aiDocumentReviewConfig', JSON.stringify(config));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new DocumentReviewSystem();
});