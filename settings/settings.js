// 默认配置
const DEFAULT_SETTINGS = {
    defaultEngine: 'grok',
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

let currentSettings = { ...DEFAULT_SETTINGS };

// DOM 元素
const grokRadio = document.getElementById('grok-radio');
const chatgptRadio = document.getElementById('chatgpt-radio');
const querySuffixInput = document.getElementById('query-suffix');
const customNameInput = document.getElementById('custom-name');
const customUrlInput = document.getElementById('custom-url');
const addCustomEngineBtn = document.getElementById('add-custom-engine');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');
const statusMessage = document.getElementById('status-message');
const customEnginesList = document.getElementById('custom-engines-list');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeI18n();
    loadSettings();
});

// 事件监听器
saveSettingsBtn.addEventListener('click', saveSettings);
resetSettingsBtn.addEventListener('click', resetSettings);
addCustomEngineBtn.addEventListener('click', addCustomEngine);

// 初始化国际化
function initializeI18n() {
    // 更新所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });
    
    // 更新 placeholder 属性
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.placeholder = message;
        }
    });
    
    // 更新页面标题
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        const key = titleElement.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            document.title = message;
        }
    }
}

// 加载设置
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['aiQuerySettings']);
        if (result.aiQuerySettings) {
            currentSettings = { ...DEFAULT_SETTINGS, ...result.aiQuerySettings };
        }
        updateUI();
    } catch (error) {
        console.error('加载设置失败:', error);
        showStatus(chrome.i18n.getMessage('loadSettingsError'), 'error');
    }
}

// 更新UI
function updateUI() {
    // 设置默认引擎
    if (currentSettings.defaultEngine === 'grok') {
        grokRadio.checked = true;
    } else if (currentSettings.defaultEngine === 'chatgpt') {
        chatgptRadio.checked = true;
    }

    // 设置查询后缀
    querySuffixInput.value = currentSettings.querySuffix || '';

    // 显示自定义引擎
    renderCustomEngines();
}

// 渲染自定义引擎列表
function renderCustomEngines() {
    customEnginesList.innerHTML = '';
    
    Object.entries(currentSettings.engines).forEach(([key, engine]) => {
        if (!engine.builtin) {
            const engineItem = document.createElement('div');
            engineItem.className = 'custom-engine-item';
            engineItem.innerHTML = `
                <div class="custom-engine-info">
                    <div class="custom-engine-name">${engine.name}</div>
                    <div class="custom-engine-url">${engine.url}</div>
                </div>
                <button class="remove-custom-engine" data-key="${key}">${chrome.i18n.getMessage('deleteEngine')}</button>
            `;
            
            // 添加删除事件
            const removeBtn = engineItem.querySelector('.remove-custom-engine');
            removeBtn.addEventListener('click', () => removeCustomEngine(key));
            
            customEnginesList.appendChild(engineItem);
        }
    });
}

// 添加自定义引擎
function addCustomEngine() {
    const name = customNameInput.value.trim();
    const url = customUrlInput.value.trim();
    
    if (!name || !url) {
        showStatus(chrome.i18n.getMessage('fillNameAndUrl'), 'error');
        return;
    }
    
    if (!url.includes('{query}')) {
        showStatus(chrome.i18n.getMessage('urlMustContainQuery'), 'error');
        return;
    }
    
    // 生成唯一key
    const key = 'custom_' + Date.now();
    
    currentSettings.engines[key] = {
        name: name,
        url: url,
        builtin: false
    };
    
    // 清空输入框
    customNameInput.value = '';
    customUrlInput.value = '';
    
    // 更新UI
    renderCustomEngines();
    showStatus(chrome.i18n.getMessage('customEngineAdded'), 'success');
}

// 删除自定义引擎
function removeCustomEngine(key) {
    if (currentSettings.engines[key] && !currentSettings.engines[key].builtin) {
        delete currentSettings.engines[key];
        
        // 如果删除的是当前默认引擎，重置为grok
        if (currentSettings.defaultEngine === key) {
            currentSettings.defaultEngine = 'grok';
            grokRadio.checked = true;
        }
        
        renderCustomEngines();
        showStatus(chrome.i18n.getMessage('customEngineDeleted'), 'success');
    }
}

// 保存设置
async function saveSettings() {
    try {
        // 获取选中的默认引擎
        if (grokRadio.checked) {
            currentSettings.defaultEngine = 'grok';
        } else if (chatgptRadio.checked) {
            currentSettings.defaultEngine = 'chatgpt';
        }
        
        // 保存查询后缀
        currentSettings.querySuffix = querySuffixInput.value.trim();
        
        // 保存到存储
        await chrome.storage.sync.set({ aiQuerySettings: currentSettings });
        showStatus(chrome.i18n.getMessage('settingsSaved'), 'success');
    } catch (error) {
        console.error('保存设置失败:', error);
        showStatus(chrome.i18n.getMessage('saveSettingsError'), 'error');
    }
}

// 重置设置
async function resetSettings() {
    if (confirm(chrome.i18n.getMessage('resetConfirm'))) {
        try {
            currentSettings = { ...DEFAULT_SETTINGS };
            await chrome.storage.sync.set({ aiQuerySettings: currentSettings });
            updateUI();
            showStatus(chrome.i18n.getMessage('settingsReset'), 'success');
        } catch (error) {
            console.error('重置设置失败:', error);
            showStatus(chrome.i18n.getMessage('resetSettingsError'), 'error');
        }
    }
}

// 显示状态消息
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}