// background.js

// 默认配置
const DEFAULT_SETTINGS = {
    defaultEngine: 'grok',
    querySuffix: '',
    engines: {
        grok: {
            name: 'Grok',
            url: 'https://grok.com/?q={query}',
            builtin: true
        },
        chatgpt: {
            name: 'ChatGPT',
            url: 'https://chatgpt.com/?q={query}',
            builtin: true
        }
    }
};

// 监听来自 content_script.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "AI_QUERY") {
    const selectedText = request.text;
    if (selectedText) {
      handleAIQuery(selectedText);
    }
    sendResponse({ status: "received" });
  }
  return true; // 保持消息通道开放以进行异步响应
});

async function handleAIQuery(text) {
  try {
    // 获取用户设置
    const result = await chrome.storage.sync.get(['aiQuerySettings']);
    const settings = result.aiQuerySettings || DEFAULT_SETTINGS;
    
    // 获取默认引擎配置
    const defaultEngine = settings.engines[settings.defaultEngine];
    if (!defaultEngine) {
      console.error('默认引擎配置不存在');
      return;
    }
    
    // 构建查询文本（添加后缀）
    let queryText = text;
    if (settings.querySuffix && settings.querySuffix.trim()) {
      queryText = text + ' ' + settings.querySuffix.trim();
    }
    
    // 构建查询URL
    const encodedText = encodeURIComponent(queryText);
    const queryUrl = defaultEngine.url.replace('{query}', encodedText);
    
    // 在新标签页中打开查询
    await chrome.tabs.create({ url: queryUrl });
    
  } catch (error) {
    console.error("AI查询失败:", error);
  }
}

// 扩展安装时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Quick Query extension installed.');
  
  // 检查是否已有设置，如果没有则使用默认设置
  const result = await chrome.storage.sync.get(['aiQuerySettings']);
  if (!result.aiQuerySettings) {
    await chrome.storage.sync.set({ aiQuerySettings: DEFAULT_SETTINGS });
    console.log('默认设置已初始化');
  }
});