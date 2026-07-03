// State Management
let state = {
    apiKey: (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== "PASTE_YOUR_API_KEY_HERE") ? CONFIG.GEMINI_API_KEY : (localStorage.getItem('gemini_api_key') || ''),
    chats: JSON.parse(localStorage.getItem('gemini_chats')) || [],
    activeChatId: localStorage.getItem('gemini_active_chat_id') || null,
    settings: JSON.parse(localStorage.getItem('gemini_settings')) || {
        model: 'gemini-2.5-flash',
        systemInstructions: '',
        temperature: 0.7
    },
    isGenerating: false
};

// Speech Recognition Instance
let recognition = null;
let isListening = false;

// Initialize Markdown Marked Options
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Custom Marked Renderer for Code Blocks with Copy Button
const renderer = new marked.Renderer();
renderer.code = function (code, language) {
    const lang = language || 'text';
    // Clean code formatting for rendering
    const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const randomId = 'code-' + Math.random().toString(36).substring(2, 9);

    return `
    <pre class="language-${lang}"><div class="code-block-header"><span class="code-block-lang">${lang}</span><button class="code-copy-btn" onclick="window.copyCode(this, '${randomId}')"><i data-lucide="copy" style="width: 14px; height: 14px;"></i><span>Copy</span></button></div><code class="language-${lang}" id="${randomId}">${escapedCode}</code></pre>
    `;
};
marked.use({ renderer });

// Global Code Copy Function
window.copyCode = function (button, codeId) {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) return;

    const textToCopy = codeElement.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        button.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i><span>Copied!</span>';
        button.style.color = '#10B981';
        lucide.createIcons();

        setTimeout(() => {
            button.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i><span>Copy</span>';
            button.style.color = '';
            lucide.createIcons();
        }, 2000);
    }).catch(err => {
        showToast('Failed to copy code', 'error');
        console.error('Error copying text: ', err);
    });
};

// Global Speak Text (TTS) Function
window.speakText = function (btn, messageId) {
    if ('speechSynthesis' in window) {
        const textElement = document.getElementById(messageId);
        if (!textElement) return;

        // Clean text from HTML tags for speech
        const text = textElement.innerText;

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            updateSpeakBtnState(btn, false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => updateSpeakBtnState(btn, false);
        utterance.onerror = () => updateSpeakBtnState(btn, false);

        updateSpeakBtnState(btn, true);
        window.speechSynthesis.speak(utterance);
    } else {
        showToast('Text-to-speech not supported in this browser', 'error');
    }
};

function updateSpeakBtnState(btn, isSpeaking) {
    if (isSpeaking) {
        btn.style.color = '#A855F7';
        btn.innerHTML = '<i data-lucide="square" style="width: 12px; height: 12px;"></i><span>Stop</span>';
    } else {
        btn.style.color = '';
        btn.innerHTML = '<i data-lucide="volume-2" style="width: 12px; height: 12px;"></i><span>Read Aloud</span>';
    }
    lucide.createIcons();
}

// DOM Elements
const DOM = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    chatHistory: document.getElementById('chatHistory'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    chatTitle: document.getElementById('chatTitle'),
    headerModelName: document.getElementById('headerModelName'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    clearCurrentBtn: document.getElementById('clearCurrentBtn'),
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatInput: document.getElementById('chatInput'),
    micBtn: document.getElementById('micBtn'),
    sendBtn: document.getElementById('sendBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
    modelSelect: document.getElementById('modelSelect'),
    systemInstructions: document.getElementById('systemInstructions'),
    temperatureSlider: document.getElementById('temperatureSlider'),
    temperatureVal: document.getElementById('temperatureVal'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon'),
    suggestedCards: document.querySelectorAll('.suggested-card')
};

// Event Listeners Initialization
function initEventListeners() {
    // Sidebar Toggles
    DOM.sidebarToggleBtn.addEventListener('click', () => DOM.sidebar.classList.add('open'));
    DOM.closeSidebarBtn.addEventListener('click', () => DOM.sidebar.classList.remove('open'));

    // Close sidebar on tapping main content on mobile
    document.querySelector('.main-content').addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !DOM.sidebarToggleBtn.contains(e.target) && !DOM.sidebar.contains(e.target)) {
            DOM.sidebar.classList.remove('open');
        }
    });

    // Chat Management
    DOM.newChatBtn.addEventListener('click', createNewChat);
    DOM.clearAllBtn.addEventListener('click', clearAllChats);
    DOM.clearCurrentBtn.addEventListener('click', clearCurrentChat);
    DOM.exportChatBtn.addEventListener('click', exportChat);

    // Message Input
    DOM.chatInput.addEventListener('input', handleInputResize);
    DOM.chatInput.addEventListener('keydown', handleKeyDown);
    DOM.sendBtn.addEventListener('click', sendMessage);

    // Suggested prompts
    DOM.suggestedCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            DOM.chatInput.value = prompt;
            handleInputResize();
            sendMessage();
        });
    });

    // Settings Modal
    DOM.settingsBtn.addEventListener('click', openSettings);
    DOM.closeSettingsBtn.addEventListener('click', closeSettings);
    DOM.cancelSettingsBtn.addEventListener('click', closeSettings);
    DOM.saveSettingsBtn.addEventListener('click', saveSettings);
    DOM.temperatureSlider.addEventListener('input', (e) => {
        DOM.temperatureVal.innerText = e.target.value;
    });
    DOM.toggleApiKeyVisibility.addEventListener('click', toggleApiKeyInputType);

    // Voice Typing
    initVoiceRecognition();
    DOM.micBtn.addEventListener('click', toggleVoiceListening);
}

// Helper Functions
function showToast(message, type = 'success') {
    DOM.toastMessage.innerText = message;

    if (type === 'error') {
        DOM.toast.classList.add('error');
        DOM.toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
        DOM.toast.classList.remove('error');
        DOM.toastIcon.setAttribute('data-lucide', 'check-circle-2');
    }

    lucide.createIcons();
    DOM.toast.classList.add('active');

    setTimeout(() => {
        DOM.toast.classList.remove('active');
    }, 3000);
}

function handleInputResize() {
    DOM.chatInput.style.height = '24px';
    const scrollHeight = DOM.chatInput.scrollHeight;
    DOM.chatInput.style.height = Math.min(scrollHeight, 200) + 'px';

    // Enable/disable send button
    const hasText = DOM.chatInput.value.trim().length > 0;
    DOM.sendBtn.disabled = !hasText || state.isGenerating;
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function toggleApiKeyInputType() {
    const isPassword = DOM.apiKeyInput.type === 'password';
    DOM.apiKeyInput.type = isPassword ? 'text' : 'password';
    const icon = DOM.toggleApiKeyVisibility.querySelector('i');
    icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    lucide.createIcons();
}

// Settings Modal Management
function openSettings() {
    DOM.apiKeyInput.value = state.apiKey;
    DOM.modelSelect.value = state.settings.model;
    DOM.systemInstructions.value = state.settings.systemInstructions;
    DOM.temperatureSlider.value = state.settings.temperature;
    DOM.temperatureVal.innerText = state.settings.temperature;

    DOM.settingsModal.classList.add('active');
}

function closeSettings() {
    DOM.settingsModal.classList.remove('active');
}

function saveSettings() {
    const key = DOM.apiKeyInput.value.trim();
    const model = DOM.modelSelect.value;
    const sysInstructions = DOM.systemInstructions.value.trim();
    const temp = parseFloat(DOM.temperatureSlider.value);

    state.apiKey = key;
    state.settings = {
        model: model,
        systemInstructions: sysInstructions,
        temperature: temp
    };

    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_settings', JSON.stringify(state.settings));

    DOM.headerModelName.innerText = model.toUpperCase().replace('GEMINI-', 'Gemini ');

    closeSettings();
    showToast('Settings saved successfully');

    // Update view if active chat exists
    renderActiveChat();
}

// Voice Recognition Management
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            DOM.micBtn.classList.add('active');
            DOM.chatInput.placeholder = 'Listening...';
        };

        recognition.onend = () => {
            isListening = false;
            DOM.micBtn.classList.remove('active');
            DOM.chatInput.placeholder = 'Message Gemini...';
            handleInputResize();
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error: ', e);
            showToast('Voice typing error', 'error');
            isListening = false;
            DOM.micBtn.classList.remove('active');
            DOM.chatInput.placeholder = 'Message Gemini...';
        };

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            DOM.chatInput.value += (DOM.chatInput.value ? ' ' : '') + transcript;
            handleInputResize();
        };
    } else {
        DOM.micBtn.style.display = 'none'; // Hide if not supported
    }
}

function toggleVoiceListening() {
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Chat Functions
function createNewChat() {
    const chatId = 'chat-' + Date.now();
    const newChat = {
        id: chatId,
        title: 'New Conversation',
        messages: [],
        timestamp: Date.now()
    };

    state.chats.unshift(newChat);
    state.activeChatId = chatId;

    saveState();
    renderSidebar();
    renderActiveChat();

    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.remove('open');
    }

    DOM.chatInput.focus();
}

function selectChat(chatId) {
    state.activeChatId = chatId;
    saveState();
    renderSidebar();
    renderActiveChat();

    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.remove('open');
    }
}

function deleteChat(chatId, event) {
    if (event) event.stopPropagation();

    state.chats = state.chats.filter(c => c.id !== chatId);

    if (state.activeChatId === chatId) {
        state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
    }

    saveState();
    renderSidebar();
    renderActiveChat();
}

function clearAllChats() {
    if (confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
        state.chats = [];
        state.activeChatId = null;
        saveState();
        renderSidebar();
        renderActiveChat();
        showToast('All chats deleted');
    }
}

function clearCurrentChat() {
    if (!state.activeChatId) return;

    if (confirm('Clear the messages in this chat?')) {
        const activeChat = state.chats.find(c => c.id === state.activeChatId);
        if (activeChat) {
            activeChat.messages = [];
            activeChat.title = 'New Conversation';
            saveState();
            renderSidebar();
            renderActiveChat();
        }
    }
}

function saveState() {
    localStorage.setItem('gemini_chats', JSON.stringify(state.chats));
    localStorage.setItem('gemini_active_chat_id', state.activeChatId);
}

// Render Functions
function renderSidebar() {
    // Clear history items (leaving title)
    const titleElement = DOM.chatHistory.querySelector('.history-section-title');
    DOM.chatHistory.innerHTML = '';
    DOM.chatHistory.appendChild(titleElement);

    if (state.chats.length === 0) {
        const emptyHint = document.createElement('div');
        emptyHint.style.color = 'var(--text-inactive)';
        emptyHint.style.fontSize = '0.8rem';
        emptyHint.style.textAlign = 'center';
        emptyHint.style.padding = '20px';
        emptyHint.innerText = 'No recent chats';
        DOM.chatHistory.appendChild(emptyHint);
        return;
    }

    state.chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === state.activeChatId ? 'active' : ''}`;
        item.addEventListener('click', () => selectChat(chat.id));

        const titleContent = chat.title || 'New Conversation';

        item.innerHTML = `
            <div class="history-item-content">
                <i data-lucide="message-square"></i>
                <span class="history-item-title">${titleContent}</span>
            </div>
            <div class="history-item-actions">
                <button class="history-action-btn delete-btn" title="Delete Chat">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;

        const delBtn = item.querySelector('.delete-btn');
        delBtn.addEventListener('click', (e) => deleteChat(chat.id, e));

        DOM.chatHistory.appendChild(item);
    });

    lucide.createIcons();
}

function renderActiveChat() {
    // If no active chat, show empty welcome screen state
    if (!state.activeChatId || state.chats.length === 0) {
        DOM.chatTitle.innerText = 'New Conversation';
        DOM.welcomeScreen.style.display = 'flex';
        DOM.messagesContainer.innerHTML = '';
        DOM.messagesContainer.appendChild(DOM.welcomeScreen);
        DOM.clearCurrentBtn.style.display = 'none';
        DOM.exportChatBtn.style.display = 'none';
        return;
    }

    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (!activeChat) return;

    DOM.chatTitle.innerText = activeChat.title || 'New Conversation';
    DOM.clearCurrentBtn.style.display = 'flex';
    DOM.exportChatBtn.style.display = 'flex';

    // Clear screen
    DOM.messagesContainer.innerHTML = '';

    if (activeChat.messages.length === 0) {
        DOM.messagesContainer.appendChild(DOM.welcomeScreen);
        DOM.welcomeScreen.style.display = 'flex';
        return;
    }

    DOM.welcomeScreen.style.display = 'none';

    activeChat.messages.forEach(msg => {
        appendMessageToUI(msg.role, msg.parts[0].text, false);
    });

    scrollToBottom();
}

function appendMessageToUI(role, text, animate = true) {
    const isUser = role === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    if (!animate) messageDiv.style.animation = 'none';

    const randomMsgId = 'msg-' + Math.random().toString(36).substring(2, 9);

    // Parse Markdown for assistant responses
    const renderedContent = isUser ? escapeHTML(text) : marked.parse(text);

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i data-lucide="${isUser ? 'user' : 'bot'}" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="message-content-wrapper">
            <div class="message-bubble" id="${randomMsgId}">
                ${renderedContent}
            </div>
            ${!isUser ? `
            <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button class="history-action-btn" title="Read Aloud" onclick="window.speakText(this, '${randomMsgId}')" style="font-size: 0.78rem; display: flex; align-items: center; gap: 4px; padding: 2px 6px;">
                    <i data-lucide="volume-2" style="width: 12px; height: 12px;"></i>
                    <span>Read Aloud</span>
                </button>
            </div>
            ` : ''}
        </div>
    `;

    DOM.messagesContainer.appendChild(messageDiv);

    // Highlight codes inside bubble if assistant
    if (!isUser) {
        Prism.highlightAllUnder(messageDiv);
    }

    lucide.createIcons();
    scrollToBottom();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function scrollToBottom() {
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
}

// Send Message Flow
async function sendMessage() {
    const promptText = DOM.chatInput.value.trim();
    if (!promptText || state.isGenerating) return;

    // 1. Check API Key
    if (!state.apiKey) {
        showToast('Please set your Gemini API Key in Settings first', 'error');
        openSettings();
        return;
    }

    // 2. Create Chat session if none active
    if (!state.activeChatId) {
        createNewChat();
    }

    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (!activeChat) return;

    // Clear input
    DOM.chatInput.value = '';
    handleInputResize();

    // Clear welcome screen
    if (activeChat.messages.length === 0) {
        DOM.welcomeScreen.style.display = 'none';
        DOM.messagesContainer.innerHTML = '';
    }

    // 3. Save User Message
    const userMessage = {
        role: 'user',
        parts: [{ text: promptText }],
        timestamp: Date.now()
    };
    activeChat.messages.push(userMessage);

    // Update active chat title if first message
    if (activeChat.title === 'New Conversation') {
        const titleLength = 30;
        activeChat.title = promptText.length > titleLength ? promptText.substring(0, titleLength) + '...' : promptText;
        renderSidebar();
    }

    saveState();
    appendMessageToUI('user', promptText);

    // 4. Set Loading State
    state.isGenerating = true;
    DOM.sendBtn.disabled = true;
    DOM.chatInput.disabled = true;

    // Create assistant message elements in DOM
    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'message assistant';

    const msgId = 'msg-' + Math.random().toString(36).substring(2, 9);

    assistantMessageDiv.innerHTML = `
        <div class="message-avatar">
            <i data-lucide="bot" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="message-content-wrapper">
            <div class="message-bubble" id="${msgId}">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px; display: none;" id="actions-${msgId}">
                <button class="history-action-btn" title="Read Aloud" onclick="window.speakText(this, '${msgId}')" style="font-size: 0.78rem; display: flex; align-items: center; gap: 4px; padding: 2px 6px;">
                    <i data-lucide="volume-2" style="width: 12px; height: 12px;"></i>
                    <span>Read Aloud</span>
                </button>
            </div>
        </div>
    `;

    DOM.messagesContainer.appendChild(assistantMessageDiv);
    lucide.createIcons();
    scrollToBottom();

    const bubbleTextContainer = document.getElementById(msgId);
    let fullResponseText = '';

    try {
        const model = state.settings.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${state.apiKey}&alt=sse`;

        // Prepare content payload for the API call
        const contentsPayload = activeChat.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: msg.parts
        }));

        const requestBody = {
            contents: contentsPayload,
            generationConfig: {
                temperature: state.settings.temperature,
                maxOutputTokens: 1000,
                topK: 40,
                topP: 0.95
            }
        };


        if (state.settings.systemInstructions) {
            requestBody.systemInstruction = {
                parts: [{ text: state.settings.systemInstructions }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP Error ${response.status}`;
            try {
                const parsedError = JSON.parse(errorText);
                errorMessage = parsedError.error?.message || errorMessage;
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        let isFirstChunk = true;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep partial line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const jsonStr = trimmed.slice(6);
                try {
                    const data = JSON.parse(jsonStr);
                    const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                    if (chunkText) {
                        if (isFirstChunk) {
                            // Remove typing indicator
                            bubbleTextContainer.innerHTML = '';
                            isFirstChunk = false;
                        }

                        fullResponseText += chunkText;
                        bubbleTextContainer.innerHTML = marked.parse(fullResponseText);

                        // Highlight syntax inside codes incrementally (throttled/immediate)
                        Prism.highlightAllUnder(assistantMessageDiv);
                        lucide.createIcons();
                        scrollToBottom();
                    }
                } catch (e) {
                    console.error('SSE chunk parsing error', e, jsonStr);
                }
            }
        }

        // Handle remainder in buffer if any
        if (buffer && buffer.startsWith('data: ')) {
            const jsonStr = buffer.slice(6);
            try {
                const data = JSON.parse(jsonStr);
                const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (chunkText) {
                    if (isFirstChunk) {
                        bubbleTextContainer.innerHTML = '';
                        isFirstChunk = false;
                    }
                    fullResponseText += chunkText;
                    bubbleTextContainer.innerHTML = marked.parse(fullResponseText);
                    Prism.highlightAllUnder(assistantMessageDiv);
                }
            } catch (e) { }
        }

        // If nothing returned
        if (fullResponseText === '') {
            bubbleTextContainer.innerHTML = '<span style="color: var(--text-inactive);">Empty response returned from model.</span>';
        } else {
            // Save Assistant Message
            const assistantMessage = {
                role: 'model',
                parts: [{ text: fullResponseText }],
                timestamp: Date.now()
            };
            activeChat.messages.push(assistantMessage);
            saveState();

            // Show speak button now that we have text
            const actionsDiv = document.getElementById(`actions-${msgId}`);
            if (actionsDiv) actionsDiv.style.display = 'flex';
        }

    } catch (err) {
        console.error('API Error: ', err);
        bubbleTextContainer.innerHTML = `<span style="color: #EF4444; font-weight: 600; display: flex; align-items: center; gap: 6px;"><i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i> Error: ${err.message}</span>`;
        lucide.createIcons();
    } finally {
        state.isGenerating = false;
        DOM.sendBtn.disabled = false;
        DOM.chatInput.disabled = false;
        DOM.chatInput.focus();
        handleInputResize();
    }
}

// Export Chat Functionality
function exportChat() {
    if (!state.activeChatId) return;

    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (!activeChat || activeChat.messages.length === 0) {
        showToast('No messages to export', 'error');
        return;
    }

    let markdown = `# ${activeChat.title || 'Conversation'}\n\n`;
    markdown += `*Exported on: ${new Date().toLocaleString()}*\n`;
    markdown += `*Model: ${state.settings.model}*\n`;
    markdown += `*Temperature: ${state.settings.temperature}*\n\n`;
    markdown += `---\n\n`;

    activeChat.messages.forEach(msg => {
        const roleName = msg.role === 'user' ? 'User' : 'Gemini';
        markdown += `### **${roleName}**:\n${msg.parts[0].text}\n\n`;
    });

    try {
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Clean filename
        const safeTitle = (activeChat.title || 'chat-history')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .substring(0, 30);

        link.setAttribute('download', `${safeTitle}-${Date.now()}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Chat exported to Markdown successfully');
    } catch (err) {
        console.error('Error exporting chat:', err);
        showToast('Failed to export chat', 'error');
    }
}

// App Initialization
function initApp() {
    // 1. Initial Badge UI render
    DOM.headerModelName.innerText = state.settings.model.toUpperCase().replace('GEMINI-', 'Gemini ');

    // 2. Render sidebar and active chat
    renderSidebar();
    renderActiveChat();

    // 3. Setup event listeners
    initEventListeners();

    // 4. Prompt for API key if missing
    if (!state.apiKey) {
        setTimeout(() => {
            showToast('Welcome! Please enter your Gemini API Key in Settings to begin.', 'error');
            openSettings();
        }, 1000);
    }
}

// Start application
document.addEventListener('DOMContentLoaded', initApp);
