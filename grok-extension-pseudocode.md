# Chrome 扩展程序伪代码：Grok 快速查询

## 1. 文件结构 (预期)

```
grok-quick-query-extension/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── content_script.js
├── background.js
├── popup_ui/ (或 similar, for the small window/sidebar)
│   ├── grok_window.html
│   ├── grok_window.js
│   └── grok_window.css
└── (optional) options/
    ├── options.html
    └── options.js
```

## 2. manifest.json (概要)

```json
{
  "manifest_version": 3,
  "name": "Grok 快速查询",
  "version": "0.1.0",
  "description": "选择文本并在 Grok.com 上快速查询。",
  "permissions": [
    "activeTab",
    "scripting",
    "storage" // 可选，用于设置
    // "contextMenus" // 可选
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"], // 或更受限的匹配
      "js": ["content_script.js"],
      "css": ["content_script.css"] // 用于按钮样式
    }
  ],
  "action": { // 可选，用于浏览器工具栏图标
    "default_popup": "options/options.html", // 或一个简单的信息弹出窗口
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [ // 如果小窗口/侧边栏是 HTML 文件
    {
      "resources": ["popup_ui/grok_window.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## 3. content_script.js

```javascript
// content_script.js

CONSTANT MIN_TEXT_LENGTH = 3;
VARIABLE grokButton = null;
VARIABLE grokWindow = null; // 可能是一个 iframe 元素的引用，或者一个窗口对象的引用
VARIABLE currentSelection = "";
VARIABLE buttonVisibleDelayTimer = null;

FUNCTION initialize():
  LISTEN for 'mouseup' event on document:
    handleTextSelection()
  LISTEN for 'mousedown' event on document: // 用于在其他地方点击时隐藏按钮
    IF grokButton is visible AND event target is not grokButton:
      hideGrokButton()

FUNCTION handleTextSelection():
  CLEAR_TIMEOUT(buttonVisibleDelayTimer);
  selectedText = window.getSelection().toString().trim();

  IF selectedText.length >= MIN_TEXT_LENGTH:
    currentSelection = selectedText;
    // 延迟显示按钮，避免在选择过程中闪烁
    buttonVisibleDelayTimer = SET_TIMEOUT(showGrokButton, 200, selectedText);
  ELSE:
    hideGrokButton();
    currentSelection = "";
  ENDIF

FUNCTION showGrokButton(selectedText):
  IF grokButton IS NULL:
    grokButton = CREATE_ELEMENT('button');
    grokButton.id = 'grok-query-button';
    grokButton.textContent = 'Grok'; // 或使用图标
    // APPLY CSS styles to grokButton (positioning, appearance)
    // Example: grokButton.style.position = 'absolute'; ...
    ADD_EVENT_LISTENER to grokButton for 'click':
      onGrokButtonClick();
    APPEND grokButton to document.body;
  ENDIF

  // 定位按钮
  selectionRect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  grokButton.style.top = (window.scrollY + selectionRect.bottom + 5) + 'px'; // 5px offset below
  grokButton.style.left = (window.scrollX + selectionRect.right + 5) + 'px'; // 5px offset to the right
  grokButton.style.display = 'block';

FUNCTION hideGrokButton():
  IF grokButton IS NOT NULL:
    grokButton.style.display = 'none';
  ENDIF

FUNCTION onGrokButtonClick():
  IF currentSelection:
    queryText = currentSelection;
    // 通知 background script 打开 Grok 窗口/侧边栏
    SEND_MESSAGE to background script with {
      action: "openGrokQuery",
      query: queryText
    };
  hideGrokButton(); // 点击后隐藏按钮

// --- 初始化 ---
initialize();
```

## 4. background.js

```javascript
// background.js

VARIABLE grokWindowId = null; // 用于跟踪小窗口的 ID

LISTEN for messages from content_script:
  IF message.action == "openGrokQuery":
    query = message.query;
    encodedQuery = encodeURIComponent(query);
    grokUrl = `https://grok.com/?q=${encodedQuery}`; // 确认实际的查询参数

    // 检查 Grok.com 是否允许 iframe (这是一个挑战，通常在 background 无法直接检查)
    // 假设我们先尝试创建窗口/侧边栏
    // 实际实现中，可能需要一种机制来处理 iframe 失败并回退到新标签页

    // 方案 1: 创建一个 Chrome 扩展程序窗口 (类似弹出窗口)
    IF grokWindowId IS NOT NULL:
      // 尝试聚焦现有窗口并更新其内容
      // 这部分比较复杂，可能需要让 grok_window.js 监听消息来更新 iframe src
      // 或者直接关闭旧的，创建新的 (更简单)
      TRY:
        chrome.windows.remove(grokWindowId);
      CATCH error:
        // 窗口可能已被用户关闭
      END TRY
      grokWindowId = null; // 重置
    ENDIF

    chrome.windows.create({
      url: chrome.runtime.getURL('popup_ui/grok_window.html') + `?query=${encodedQuery}`, // 传递查询给自定义页面
      type: 'popup', // 'panel' 类型已被弃用，'popup' 是一个选择
      width: 400,
      height: 600,
      // left, top 可以设置初始位置
    }, FUNCTION(newWindow):
      grokWindowId = newWindow.id;
    });

    // 方案 2: 注入一个 iframe 作为侧边栏 (更复杂，通常在 content script 中完成，但需要 background 协调)
    // 此方案下，content_script 会创建 iframe，background 仅传递 URL

    // 方案 3: 回退到打开新标签页 (如果 iframe 方案证实不可行)
    // chrome.tabs.create({ url: grokUrl });

  ENDIF
END LISTEN

// 监听窗口关闭事件，以便重置 grokWindowId
chrome.windows.onRemoved.addListener(FUNCTION(closedWindowId):
  IF closedWindowId == grokWindowId:
    grokWindowId = null;
  ENDIF
});
```

## 5. popup_ui/grok_window.html (用于小窗口方案)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Grok 查询</title>
  <link rel="stylesheet" href="grok_window.css">
</head>
<body>
  <div class="window-controls">
    <button id="maximize-button">最大化</button>
    <button id="close-button">关闭</button>
  </div>
  <iframe id="grok-iframe" src="" frameborder="0"></iframe>
  <script src="grok_window.js"></script>
</body>
</html>
```

## 6. popup_ui/grok_window.js

```javascript
// grok_window.js

VARIABLE grokIframe = document.getElementById('grok-iframe');
VARIABLE maximizeButton = document.getElementById('maximize-button');
VARIABLE closeButton = document.getElementById('close-button');

FUNCTION initialize():
  // 从 URL 获取查询参数
  urlParams = new URLSearchParams(window.location.search);
  query = urlParams.get('query');

  IF query:
    grokUrl = `https://grok.com/?q=${query}`; // 确保这里的 query 已经是编码过的
    grokIframe.src = grokUrl;
  ELSE:
    // 显示错误或默认页面
    grokIframe.srcdoc = "<p>无法加载查询。</p>";
  ENDIF

  ADD_EVENT_LISTENER to maximizeButton for 'click':
    // 实现窗口最大化/恢复逻辑
    // chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, { state: "maximized" / "normal" });
    // 需要获取当前窗口 ID，或者让 background script 处理
    // 简单版本：发送消息给 background script
    SEND_MESSAGE to background script with { action: "toggleMaximizeGrokWindow" };

  ADD_EVENT_LISTENER to closeButton for 'click':
    window.close(); // 关闭此弹出窗口
  ENDIF

  // 使窗口可拖动和调整大小 (这部分在标准 chrome.windows.create 'popup' 中可能受限)
  // 如果是完全自定义的 HTML 覆盖层 (由 content script 注入)，则需要手动实现拖放和调整大小
  // 对于 chrome.windows.create, 操作系统通常处理这些

// --- 初始化 ---
initialize();

// (可选) 监听来自 background script 的消息以更新 iframe src
LISTEN for messages from background script:
  IF message.action == "updateQuery":
    newEncodedQuery = message.query;
    grokIframe.src = `https://grok.com/?q=${newEncodedQuery}`;
  ENDIF
END LISTEN
```

## 7. popup_ui/grok_window.css

```css
/* grok_window.css */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止双滚动条 */
}

.window-controls {
  padding: 5px;
  background-color: #f0f0f0;
  text-align: right;
  flex-shrink: 0; /* 防止控件区域被压缩 */
}

.window-controls button {
  margin-left: 5px;
}

#grok-iframe {
  flex-grow: 1; /* iframe 占据剩余空间 */
  border: none;
  width: 100%;
  height: 100%; /* 确保 iframe 填满其容器 */
}
```

## 8. content_script.css (用于 Grok 查询按钮)

```css
/* content_script.css */
#grok-query-button {
  position: absolute;
  z-index: 99999; /* 确保在顶层 */
  background-color: #4CAF50; /* 示例颜色 */
  color: white;
  border: none;
  padding: 5px 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  /* 其他样式，如字体、过渡效果等 */
}

#grok-query-button:hover {
  background-color: #45a049;
}
```

**重要注意事项和挑战:**

*   **Grok.com 的 `X-Frame-Options` 或 CSP**：这是最大的潜在障碍。如果 Grok.com 不允许被嵌入到 iframe 中，那么小窗口/侧边栏方案将无法按预期工作。必须准备一个回退方案（例如，在新标签页中打开）。在 `background.js` 中，直接检测 iframe 是否成功加载是困难的。`grok_window.html` 中的 iframe `onerror` 事件可能可以捕获一些情况，但 CSP 错误通常只在控制台显示，脚本层面不易捕获。
*   **小窗口 (`chrome.windows.create({type: 'popup'})`)**：
    *   这种窗口通常有最少的浏览器 UI（无地址栏、工具栏）。
    *   其行为（如是否总在最前）和外观可能受操作系统和 Chrome 版本影响。
    *   拖动和调整大小通常由操作系统处理。自定义最大化按钮需要使用 `chrome.windows.update` API。
*   **侧边栏实现**：如果选择侧边栏，通常是在 `content_script.js` 中创建一个 `<iframe>` 并将其定位到页面的一侧。这需要更复杂的 DOM 操作和样式来确保其行为正确且不破坏页面布局。`background.js` 仍然可以用于协调 URL。
*   **消息传递**：`content_script.js`, `background.js`, 和 `grok_window.js` (如果使用) 之间需要通过 `chrome.runtime.sendMessage` 和 `chrome.runtime.onMessage.addListener` 进行通信。
*   **安全性**：确保所有来自内容脚本的数据在背景脚本中使用前都经过适当的清理或验证（尽管在这个例子中，只是一个查询字符串）。
*   **用户体验**：按钮的定位、显示/隐藏逻辑需要仔细调整，以确保不打扰用户。小窗口/侧边栏的交互也应流畅。

这份伪代码提供了一个起点。实际实现时需要根据 Chrome 扩展 API 的具体细节和遇到的挑战进行调整。