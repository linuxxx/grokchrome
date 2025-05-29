document.addEventListener('DOMContentLoaded', () => {
    // 1. 获取 Grok 查询 URL
    const params = new URLSearchParams(window.location.search);
    const grokUrlParam = params.get('grokUrl');

    if (grokUrlParam) {
        try {
            const decodedGrokUrl = decodeURIComponent(grokUrlParam);

            // 2. 设置 iframe 的 src
            const iframe = document.getElementById('grok-iframe');
            if (iframe) {
                iframe.src = decodedGrokUrl;
            } else {
                console.error('Grok iframe element not found.');
            }
        } catch (e) {
            console.error('Error decoding Grok URL:', e);
            // 可以考虑在此处显示错误信息给用户或关闭窗口
        }
    } else {
        console.error('grokUrl parameter not found in window URL.');
        // 可以考虑在此处显示错误信息给用户或关闭窗口
    }

    // 3. 处理关闭按钮
    const closeButton = document.getElementById('close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            window.close();
        });
    } else {
        console.error('Close button element not found.');
    }

    // 4. (可选) 处理最大化/还原按钮 - 初始版本不实现
    // const maximizeButton = document.getElementById('maximize-button');
    // if (maximizeButton) {
    //     maximizeButton.addEventListener('click', () => {
    //         // 向背景脚本发送消息请求最大化
    //         // chrome.runtime.sendMessage({ type: 'MAXIMIZE_WINDOW' });
    //     });
    // }
});