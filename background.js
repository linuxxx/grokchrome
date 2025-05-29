// background.js

const GROK_BASE_URL = "https://grok.com/"; // 假设的 Grok 基础 URL
// 实际查询参数名需要确认，暂时使用 'q'
const GROK_QUERY_PARAM = "q";

// 监听来自 content_script.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GROK_QUERY") {
    const selectedText = request.text;
    if (selectedText) {
      handleGrokQuery(selectedText);
    }
    // 可以选择性地发送响应
    // sendResponse({ status: "received" });
  }
  // 返回 true 表示我们将异步发送响应（如果需要）
  // return true;
});

async function handleGrokQuery(text) {
  const encodedText = encodeURIComponent(text);
  const grokQueryUrl = `${GROK_BASE_URL}?${GROK_QUERY_PARAM}=${encodedText}`;
  try {
    await chrome.tabs.create({ url: grokQueryUrl });
  } catch (tabError) {
    console.error("Failed to open Grok query in a new tab:", tabError);
    // 进一步的回退或错误通知可以在这里处理
  }
}

// 初始加载时可以做一些事情，例如检查存储的设置等
// chrome.runtime.onInstalled.addListener(() => {
//   console.log('Grok Quick Query extension installed.');
// });