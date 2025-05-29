let queryButton = null;

document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('mousedown', handleMouseDown);

function handleMouseUp(event) {
  // 如果是右键点击，则不执行任何操作，以确保上下文菜单正常显示
  if (event.button === 2) {
    return;
  }

  // 确保不是在查询按钮上触发的 mouseup
  if (queryButton && (event.target === queryButton || queryButton.contains(event.target))) {
    return;
  }

  const selectedText = window.getSelection().toString().trim();

  if (selectedText) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // 移除旧按钮（如果存在）
      removeQueryButton();

      // 创建新按钮
      queryButton = document.createElement('button');
      queryButton.id = 'grok-query-button';
      queryButton.textContent = ''; // 清空文本内容
      queryButton.style.position = 'absolute';
      queryButton.style.zIndex = '99999'; // 确保按钮在顶层
      // queryButton.style.padding = '2px'; // 根据图标大小和视觉效果调整
      // queryButton.style.border = '1px solid #ccc'; // 可选：添加边框以便调试
      // queryButton.style.backgroundColor = 'white'; // 可选：背景色

      // 创建图像元素
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL('icons/favicon.ico');
      img.style.width = '16px';
      img.style.height = '16px';
      img.style.verticalAlign = 'middle';
      img.alt = 'Grok Query';

      // 将图像附加到按钮
      queryButton.appendChild(img);
      
      document.body.appendChild(queryButton); // 先添加到DOM，以便获取尺寸

      // 定位按钮 - 基于鼠标释放位置
      // 将按钮初始定位在鼠标事件发生的位置附近
      let targetTop = event.pageY;
      let targetLeft = event.pageX + 15; // 在鼠标指针右侧15px

      queryButton.style.top = `${targetTop}px`; // 临时设置，以便获取高度
      queryButton.style.left = `${targetLeft}px`;
      
      // 动态调整位置，确保按钮完全可见
      // 使用 setTimeout 确保按钮（尤其是图片）已渲染并具有尺寸
      setTimeout(() => {
        if (!queryButton) return; // 按钮可能已被移除

        const buttonHeight = queryButton.offsetHeight;
        const buttonWidth = queryButton.offsetWidth;

        // 尝试将按钮垂直居中于鼠标Y坐标
        let newTop = targetTop - (buttonHeight / 2);
        let newLeft = targetLeft;
        
        // 边界检查
        // 检查右边界 (视口宽度 + 滚动偏移 - 按钮宽度 - 边距)
        if ((newLeft + buttonWidth) > (window.scrollX + window.innerWidth - 5)) {
            newLeft = window.scrollX + window.innerWidth - buttonWidth - 5;
        }
        // 检查左边界 (滚动偏移 + 边距)
        if (newLeft < (window.scrollX + 5)) {
            newLeft = window.scrollX + 5;
        }
        // 检查下边界 (视口高度 + 滚动偏移 - 按钮高度 - 边距)
        if ((newTop + buttonHeight) > (window.scrollY + window.innerHeight - 5)) {
            newTop = window.scrollY + window.innerHeight - buttonHeight - 5;
        }
        // 检查上边界 (滚动偏移 + 边距)
        if (newTop < (window.scrollY + 5)) {
            newTop = window.scrollY + 5;
        }
        
        queryButton.style.top = `${newTop}px`;
        queryButton.style.left = `${newLeft}px`;

      }, 0); // 延迟0毫秒，允许浏览器先渲染和图片加载


      queryButton.addEventListener('click', () => {
        const currentSelectedText = window.getSelection().toString().trim();
        if (currentSelectedText) {
          chrome.runtime.sendMessage({ type: "GROK_QUERY", text: currentSelectedText }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Grok Query Error:", chrome.runtime.lastError.message);
            } else {
              console.log("Grok Query Sent:", currentSelectedText, "Response:", response);
            }
          });
        }
        removeQueryButton(); // 点击后移除按钮
      });
    }
  } else {
    // 如果 mouseup 时没有选中文本，则移除按钮
    removeQueryButton();
  }
}

function handleMouseDown(event) {
  // 如果是右键点击，则不执行任何操作
  if (event.button === 2) {
    return;
  }

  // 如果点击发生在查询按钮之外，则移除按钮。
  // mouseup 事件会负责在有新选区时重新创建按钮。
  if (queryButton && event.target !== queryButton && !queryButton.contains(event.target)) {
    removeQueryButton();
  }
}

function removeQueryButton() {
  if (queryButton) {
    queryButton.remove();
    queryButton = null;
  }
}

// 初始加载时，如果已有选区，也尝试显示按钮 (边缘情况，通常由 mouseup 处理)
// window.addEventListener('load', () => {
//   const selectedText = window.getSelection().toString().trim();
//   if (selectedText) {
//     // 模拟一个 mouseup 事件来触发按钮显示逻辑
//     // 这比较 hacky，更好的方式是重构 handleMouseUp 的核心逻辑为一个可复用函数
//     // document.dispatchEvent(new MouseEvent('mouseup'));
//   }
// });

console.log("Grok Quick Query content script loaded. Icon button update.");