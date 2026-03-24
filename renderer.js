// --- Explanation / 説明 / คำอธิบาย ---
// [EN] Renderer Process: Handles the logic inside the window (UI).
// [JP] レンダラー・プロセス (Renderer Process): ウィンドウ内のロジック（UI）を担当します。
// [TH] Renderer Process: จัดการตรรกะและการทำงานต่างๆ ภายในหน้าต่างโปรแกรม (ส่วนติดต่อผู้ใช้)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, limit, orderBy, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAf6RujZUAByBmMcgvYerYD_wOyP1q0MbY",
    authDomain: "project-ai-of-world.firebaseapp.com",
    projectId: "project-ai-of-world",
    storageBucket: "project-ai-of-world.firebasestorage.app",
    messagingSenderId: "526063420718",
    appId: "1:526063420718:web:d7b1b7f6a48be1438726bf",
    measurementId: "G-FWC07BK9SV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Platform Detection & UI Adjustment
// プラットフォームの検出 (Platform no kenshutsu) - การตรวจหาแพลตฟอร์ม
const isMac = window.electronAPI && window.electronAPI.isMac;

function updateUIShortcuts() {
    if (!isMac) return;
    
    // Replace "Ctrl+" with "Cmd+" in all titles, placeholders, and button texts
    const elements = document.querySelectorAll('[title*="Ctrl+"], [placeholder*="Ctrl+"]');
    elements.forEach(el => {
        if (el.title) el.title = el.title.replace(/Ctrl\+/g, 'Cmd+');
        if (el.placeholder) el.placeholder = el.placeholder.replace(/Ctrl\+/g, 'Cmd+');
    });

    // Specifically target buttons or labels that might have Ctrl+ in their textContent
    const allLabels = document.querySelectorAll('button, label, span, p, div');
    allLabels.forEach(el => {
        if (el.children.length === 0 && el.textContent.includes('Ctrl+')) {
           el.textContent = el.textContent.replace(/Ctrl\+/g, 'Cmd+');
        }
    });
}
window.addEventListener('DOMContentLoaded', updateUIShortcuts);

// Authentication Logic
// Global registries moved below

const defaultPrompts = {
    general: [
        { label: "💡 Brainstorm", text: "Give me 5 creative ideas for [YOUR TOPIC]:" },
        { label: "📝 Summarize", text: "Please summarize the following text into 3 bullet points:\n\n[PASTE SENTENCE]" },
        { label: "🔍 Explain Like I'm 5", text: "Explain [YOUR TOPIC] as if I am 5 years old:" },
        { label: "✍️ Rewrite Pro", text: "Rewrite the following text to sound more professional and concise:\n\n[PASTE SENTENCE]" },
        { label: "💻 Code Helper", text: "How do I implement [YOUR TOPIC] in JavaScript?" }
    ],
    ecommerce: [
        { label: "📸 Product Desc", text: "Create a minimalist product description for [YOUR PRODUCT]:" },
        { label: "✉️ Email Marketing", text: "Write a high-converting email about [YOUR TOPIC]:" },
        { label: "🏷️ Ad Headlines", text: "Generate 5 catchy Facebook ad headlines for [YOUR PRODUCT]:" },
        { label: "🎬 AI Video Ads", text: "คุณคือ AI สร้าง prompt วิดีโอสินค้าแบบมืออาชีพ\n\nโจทย์: [YOUR TOPIC]" }
    ],
    japanese: [
        { label: "📝 Grammar Breakdown", text: "Please break down the grammar and particles of this sentence: [PASTE SENTENCE]" },
        { label: "🔄 Natural", text: "Translate this to natural Japanese (polite/casual): [YOUR TEXT]" },
        { label: "🈁 Kanji Analysis", text: "Explain the Kanji components and readings of: [YOUR KANJI]" }
    ],
    "graphic-design": [
        { label: "🎨 Image Prompt", text: "Create a highly detailed image generation prompt for Leonardo AI based on this idea: [YOUR IDEA]. Include lighting, style, and camera angles." },
        { label: "🖌️ Color Palette", text: "Suggest 3 unique color palettes (with hex codes) for a project about [YOUR TOPIC]. Explain the mood of each." }
    ]
};

const defaultCustomPrompts = [
    { name: "💡 Brainstorm", text: "Give me 5 creative ideas for [YOUR TOPIC]:" },
    { name: "📝 Summarize", text: "Please summarize the following text into 3 bullet points:\n\n[PASTE SENTENCE]" },
    { name: "🔍 Explain Like I'm 5", text: "Explain [YOUR TOPIC] as if I am 5 years old:" },
    { name: "✍️ Rewrite Pro", text: "Rewrite the following text to sound more professional and concise:\n\n[PASTE SENTENCE]" },
    { name: "💻 Code Helper", text: "How do I implement [YOUR TOPIC] in JavaScript?" },
    { name: "🎬 AI Video Ads", text: "คุณคือ AI สร้าง prompt วิดีโอสินค้าแบบมืออาชีพ\n\nโจทย์: [YOUR TOPIC]" },
    { name: "Natural Thai", text: "ช่วยแปลประโยคนี้เป็นภาษาไทยที่ฟังดูเป็นธรรมชาติ:\n\n[YOUR TEXT]" },
    { name: "Grammar Check", text: "ช่วยตรวจสอบไวยากรณ์และแก้ไขประโยคนี้ให้ถูกต้อง:\n\n[YOUR TEXT]" }
];

const defaultSettings = {
    theme: 'dark',
    username: '',
    provider: 'gemini',
    currentMode: 'general',
    autoSend: false,
    usePrefix: false,
    prefix: 'I am studying {}.',
    useSuffix: true,
    suffix: ' Please explain in Thai.',
    autoRead: false,
    showEcommerce: true,
    showJapanese: true,
    showGraphicDesign: true,
    showGemini: true,
    showChatGPT: true,
    showClaude: true,
    showDeepSeek: true,
    showLeonardo: true,
    showBing: true,
    showPerplexity: true,
    showGrok: true,
    showDuck: true,
    showCustomAI: false,
    customAIName: 'Custom AI',
    customAIUrl: '',
    customAIQuickLinks: [],
    useApiMode: false,
    openRouterKey: '',
    layoutStyle: 'scroll',
    layouts: {
        general: ['gemini', 'chatgpt'],
        ecommerce: ['gemini', 'leonardo'],
        japanese: ['gemini', 'claude'],
        'graphic-design': ['chatgpt', 'leonardo', 'custom']
    },
    panelOrder: ['gemini', 'chatgpt', 'claude', 'deepseek', 'leonardo', 'bing', 'perplexity', 'grok', 'duck', 'api', 'custom'],
    customPrompts: null, // Initialized from defaultPrompts if empty
    communityAlias: '',
    communityModes: [],
    customTabs: [],
    // New Professional Settings
    autoOpenSidebar: true,
    autoHideSidebar: false,
    addAiIconTop: true,
    autoInputOnly: false,
    labelTopic: '[YOUR TOPIC]',
    labelProduct: '[YOUR PRODUCT]',
    labelText: '[YOUR TEXT]',
    excludeAIs: {
        chatgpt: false,
        gemini: false,
        claude: false,
        leonardo: false
    },
    notionApiKey: '',
    notionDatabaseId: '',
    lookupperShortcut: 'Alt+Q',
    lookupperPrivacy: true,
    lookupperAutoSpeak: false,
    lookupperEnabled: true,
    lookupperMemory: {},
    scanMode: false,
    assistantMode: 'tutor',

    // Add-on Platform (Aura AI 3.0)
    addons: {
        translateOverlay: { installed: true, enabled: true },
        ocrEngine: { installed: true, enabled: true },
        localAI: { installed: false, enabled: false }, // Performance Upgrade
        aiHub: { installed: true, enabled: true } // Core
    }
};

let btnOpenCreateAddon = document.getElementById('btn-open-create-addon');
let btnCloseCreateAddon = document.getElementById('btn-close-create-addon');
let btnPublishAddon = document.getElementById('btn-publish-addon');
let createAddonOverlay = document.getElementById('create-addon-overlay');
let communityAddonList = document.getElementById('community-addon-list');
let storeOverlay = document.getElementById('store-overlay');

let settings = JSON.parse(JSON.stringify(defaultSettings));

// Platform Core Helpers (Single Source of Truth)
function isAddonActive(id) {
    if (!settings || !settings.addons || !settings.addons[id]) return false;
    return settings.addons[id].installed && settings.addons[id].enabled;
}

// --- Aura-Flow (Autonomous Agent Engine) ---
// [TH] คลาสหลักสำหรับคุมระบบ AI อัตโนมัติ (Aura-Flow)
class AuraFlow {
    constructor() {
        this.currentSkill = null;
        this.activeFlow = null;
    }

    async loadSkill(name) {
        const md = await window.electronAPI.readSkill(name);
        if (!md) return null;
        
        this.currentSkill = this.parseSkillMarkdown(md);
        return this.currentSkill;
    }

    parseSkillMarkdown(md) {
        const sections = {};
        const yamlMatch = md.match(/^---\s*([\s\S]*?)\s*---/);
        const yamlStr = yamlMatch ? yamlMatch[1] : '';
        
        // Basic YAML parser for simple fields
        const metadata = {};
        yamlStr.split('\n').forEach(line => {
            const [k, v] = line.split(':').map(s => s.trim());
            if (k && v) metadata[k] = v;
        });

        // Section extractor
        const parts = md.split(/^#\s+/m);
        parts.forEach(p => {
            const lines = p.split('\n');
            const title = lines[0].trim().toLowerCase();
            const content = lines.slice(1).join('\n').trim();
            if (title) sections[title] = content;
        });

        return { metadata, sections };
    }

    getSystemPrompt(agentRole = null) {
        if (!this.currentSkill) return "You are Aura AI, a professional assistant.";
        
        const { metadata, sections } = this.currentSkill;
        const isTeam = metadata.type === 'team';
        const isWorker = metadata.type === 'worker';
        
        let prompt = `
            ${sections.identity || ''}
            # PROTOCOL
            ${sections.protocol || sections['worker protocols'] || ''}
            # TOOLS & CAPABILITIES
            ${sections.tools || ''}
        `;

        if (isTeam && agentRole) {
            prompt += `\n\nCURRENT ACTIVE ROLE: [${agentRole.toUpperCase()}]\nFocus strictly on your specific goal as defined in the ${agentRole} role.`;
        }
        
        if (isWorker) {
            prompt += `\n\nBATCH WORKER MODE: You are processing a queue. Always save progress to the results file.`;
        }

        prompt += `\n\n# WORKSPACE\nEverything you create must be saved to the sandboxed workspace.\nTo run a command, use the following format: \`RUN_CMD: [command]\`\nTo write a file, use the following format: \`WRITE_FILE: [path] | [content]\``;

        return prompt.trim();
    }

    async runCommand(cmd) {
        return await window.electronAPI.runShellCommand(cmd);
    }
}
const auraFlow = new AuraFlow();

function updateAddonState(id, props) {
    if (!settings.addons) settings.addons = {};
    if (!settings.addons[id]) settings.addons[id] = { installed: false, enabled: false };
    settings.addons[id] = { ...settings.addons[id], ...props };
    
    // Legacy Sync for Lookupper
    if (id === 'translateOverlay') {
        settings.lookupperEnabled = settings.addons[id].enabled;
        window.electronAPI.send('toMain', { 
            type: 'update-shortcuts', 
            shortcuts: {
                ...settings.shortcuts,
                lookupper: { enabled: settings.addons[id].enabled, key: settings.lookupperShortcut || 'Alt+Q' }
            } 
        });
    }

    // [EN] Sync to Tray Status
    // [TH] ซิงค์สถานะ Add-on ไปที่ Tray
    window.electronAPI.send('toMain', { type: 'update-addon-status', addons: settings.addons });

    saveSettings();
    if (typeof refreshModularUI === 'function') refreshModularUI();
    if (typeof updateAddonSlotUI === 'function') updateAddonSlotUI();
}

// --- Aura Lookupper (Aura Assistant) Logic ---
const lookupperBubble = document.getElementById('lookupper-bubble');
const bubbleInner = document.getElementById('bubble-inner-content');
const bubbleLoader = lookupperBubble?.querySelector('.loader-wave');

// OCR Results Cache (LRU-like with 30m TTL)
const ocrCache = new Map();
const MAX_CACHE_ENTRIES = 200;
const CACHE_TTL = 30 * 60 * 1000;

function getCachedResult(imageDataUrl) {
    const cached = ocrCache.get(imageDataUrl);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.result;
    }
    return null;
}

function setCachedResult(imageDataUrl, result) {
    if (ocrCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = ocrCache.keys().next().value;
        ocrCache.delete(firstKey);
    }
    ocrCache.set(imageDataUrl, { result, timestamp: Date.now() });
}

window.electronAPI.receive('fromMain', async (arg) => {
    if (arg.type === 'shortcut-triggered' && arg.action === 'lookupper') {
        console.log("Renderer: Received 'lookupper' shortcut trigger. Sending capture request...");
        window.electronAPI.send('toMain', { type: 'lookupper-capture' });
    } else if (arg.type === 'lookupper-captured') {
        processLookupperCapture(arg);
    } else if (arg.type === 'assistant-action') {
        if (arg.action === 'tts') triggerTTS(arg.text);
        else if (arg.action === 'notion') saveToNotion(arg.content);
        else if (arg.action === 'toggle-favorite') {
            const word = arg.text.toLowerCase().trim();
            if (settings.lookupperMemory && settings.lookupperMemory[word]) {
                settings.lookupperMemory[word].isFavorite = arg.isFavorite;
                saveSettings();
                showToast(arg.isFavorite ? "⭐ Added to Favorites" : "🗑️ Removed from Favorites");
            }
        }
    } else if (arg.type === 'assistant-setting') {
        settings[arg.key] = arg.value;
        saveSettings();
        showToast(`⚙️ Assistant Mode: ${arg.value.toUpperCase()}`);
    } else if (arg.type === 'open-settings') {
        if (settingsOverlay) {
            applySettingsToUI();
            settingsOverlay.classList.remove('hidden');
        }
    }
});

async function processLookupperCapture(arg) {
    const { data: imageDataUrl, x, y, scaleFactor } = arg;
    
    // 1. Show floating assistant immediately and start loading
    const showSnippet = settings.lookupperPrivacy !== false;
    window.electronAPI.send('toMain', { 
        type: 'assistant-show', 
        x: x + 20, 
        y: y + 20,
        data: imageDataUrl,
        showSnippet: showSnippet
    });

    // 2. Check Cache
    const cached = getCachedResult(imageDataUrl);
    if (cached) {
        console.log("OCR Cache Hit!");
        showLookupperBubble(cached, x, y);
        return;
    }

    try {
        // 3. Preprocess Image (Adaptive Thresholding + Upscale)
        const processedBlob = await preprocessImage(imageDataUrl);
        // 4. Perform OCR via Main Process IPC
        const reader = new FileReader();
        const blobDataUrl = await new Promise(resolve => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(processedBlob);
        });
        const ocrResult = await window.electronAPI.recognizeText(blobDataUrl);
        
        // 5. Show results with Confidence Indicator
        if (ocrResult && ocrResult.text) {
            setCachedResult(imageDataUrl, ocrResult.text);
            
            // Confidence Dot Coloring
            const confDot = document.getElementById('bubble-confidence-dot');
            if (confDot) {
                confDot.className = 'confidence-dot'; // Reset
                const conf = ocrResult.confidence || 0.85; // Fallback if missing
                if (conf > 0.8) confDot.classList.add('conf-high');
                else if (conf > 0.5) confDot.classList.add('conf-med');
                else confDot.classList.add('conf-low');
            }
            
            const textEl = document.getElementById('bubble-text-content');
            if (textEl) textEl.textContent = ocrResult.text;
            
            // Update assistant with OCR text
            window.electronAPI.send('toMain', { 
                type: 'assistant-update', 
                text: ocrResult.text, 
                confidence: ocrResult.confidence 
            });

            showLookupperBubble(ocrResult.text, x, y);
        } else {
            showLookupperBubbleError("No text detected. Try hovering closer.", x, y);
        }
    } catch (e) {
        console.error("Lookupper Processing Error:", e);
        showLookupperBubbleError(e.message, x, y);
    }
}

async function preprocessImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Upscale 2x for better OCR accuracy
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Adaptive Thresholding logic (Simple Local Mean)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Grayscale
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                // Basic Binarization (will upgrade to adaptive if needed)
                const v = gray > 128 ? 255 : 0;
                data[i] = data[i+1] = data[i+2] = v;
            }
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png');
        };
        img.src = dataUrl;
    });
}

function showLookupperBubbleLoading(x, y) {
    if (!lookupperBubble) return;
    lookupperBubble.classList.remove('hidden');
    positionBubble(x, y);
    if (bubbleLoader) bubbleLoader.style.display = 'flex';
    if (bubbleInner) bubbleInner.innerHTML = '';
}

function showLookupperBubbleError(msg, x, y) {
    if (bubbleLoader) bubbleLoader.style.display = 'none';
    if (bubbleInner) bubbleInner.innerHTML = `<span style="color: #ff4d4d;">Error: ${msg}</span>`;
    
    // Notify assistant window of error
    window.electronAPI.send('toMain', { 
        type: 'assistant-update', 
        html: `<span style="color: #ff4d4d;">Error: ${msg}</span>` 
    });
}

function positionBubble(x, y) {
    const bubbleWidth = 320;
    const bubbleHeight = 350;
    let finalX = x + 20;
    let finalY = y + 20;
    
    if (finalX + bubbleWidth > window.innerWidth) finalX = window.innerWidth - bubbleWidth - 20;
    if (finalY + bubbleHeight > window.innerHeight) finalY = window.innerHeight - bubbleHeight - 20;
    
    lookupperBubble.style.left = `${finalX}px`;
    lookupperBubble.style.top = `${finalY}px`;
    lookupperBubble.style.transform = 'none';
}

async function showLookupperBubble(text, x, y) {
    if (!lookupperBubble) return;
    
    // Position bubble
    positionBubble(x, y);
    if (bubbleLoader) bubbleLoader.style.display = 'flex';
    
    // 1. Context Mode
    const mode = settings.assistantMode || 'tutor'; // game, movie, tutor
    const isSentence = text.trim().split(/\s+/).length > 2;
    
    // 2. LAYER 1: Immediate Fast Translation (Google)
    const cleanedText = text.replace(/[|\]\[}{|]/g, ' ').replace(/\s+/g, ' ').trim();
    const fastPromise = translateWithGoogle(cleanedText, settings.targetLang || 'th').then(fastTrans => {
        window.electronAPI.send('toMain', { 
            type: 'assistant-update', 
            fastText: fastTrans,
            mode: mode,
            isFavorite: (settings.lookupperMemory && settings.lookupperMemory[text.toLowerCase().trim()]?.isFavorite) || false
        });
        return fastTrans;
    });

    // 3. LAYER 2: Smart AI Deep Analysis
    let finalPrompt = '';
    const isFlowMode = settings.assistantMode === 'flow' && settings.activeSkill && settings.activeSkill !== 'none';
    let teamAgents = null;
    let isWorker = false;
    
    if (isFlowMode) {
        const skill = await auraFlow.loadSkill(settings.activeSkill);
        if (skill) {
            if (skill.metadata.type === 'team') {
                teamAgents = ['analyst', 'strategist', 'copywriter'];
            } else if (skill.metadata.type === 'worker') {
                isWorker = true;
            } else {
                finalPrompt = `${auraFlow.getSystemPrompt()}\n\nCONTEXT FROM SCREEN: "${text}"\nUSER REQUEST: Analyze and perform necessary actions.`;
            }
        }
    } else {
        finalPrompt = `You are "Aura Assistant", a professional language tutor specializing in ${mode.toUpperCase()} context.
Analyze context: "${text}"
DO NOT repeat the input. Return ONLY a structured breakdown in Thai:
### 🧠 Deep Analysis (${mode})
**ความหมายเชิงบริบท**: [อธิบายการใช้งานในบริบท ${mode} สั้นๆ]

**คำศัพท์สำคัญ**:
- Word1 (แปล): คำอธิบายสั้นๆ
- Word2 (แปล): คำอธิบายสั้นๆ

**ประโยคตัวอย่าง**: [ประโยคที่เกี่ยวข้องกับ ${mode}]

---
VOCAB_DATA: word1|translation1|definition1, word2|translation2|definition2
`;
    }

    try {
        console.log("Renderer: Layer 2 AI call initiated...");
        let response = "";
        const localServerOk = await checkLocalAIConnection();
        
        if (isFlowMode && teamAgents) {
            // --- Multi-Agent Team Execution ---
            let teamContextCount = 0;
            let teamContext = `USER REQUEST: Analyze the following context and perform marketing/strategy task: "${text}"\n\n`;
            
            for (const agent of teamAgents) {
                teamContextCount++;
                console.log(`AuraFlow: Agent [${agent}] is thinking...`);
                const agentPrompt = `${auraFlow.getSystemPrompt(agent)}\n\n${teamContext}`;
                const agentResponse = await callAI(localServerOk ? 'api' : 'gemini', agentPrompt);
                
                teamContext += `### 👤 Agent: ${agent.toUpperCase()}\n${agentResponse}\n\n---\n`;
                
                // Real-time update to the floating bubble
                window.electronAPI.send('toMain', { 
                    type: 'assistant-update', 
                    html: `### 🤖 Team Collaboration (${teamContextCount}/${teamAgents.length})\n\n${teamContext}` 
                });
            }
            response = teamContext;
        } else if (isFlowMode && isWorker) {
            // --- Aura-Worker Batch Execution ---
            let batchContext = `### 🏭 Aura-Worker: Starting Batch Process...\n\n`;
            
            // [TH] ลองอ่านคิวจากไฟล์ใน Sandbox
            let queue = [];
            try {
                // We use a temporary command to list tasks or read a specific file
                // For the prototype, we assume 'text' contains the comma-separated tasks if no file exists
                queue = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
                if (queue.length === 0) queue = ["Task 1", "Task 2", "Task 3"]; // Fallback
            } catch (e) {
                queue = ["Task 1", "Task 2", "Task 3"];
            }

            let completed = 0;
            for (const item of queue) {
                completed++;
                console.log(`AuraFlow: Worker processing item [${item}] (${completed}/${queue.length})...`);
                
                const workerPrompt = `${auraFlow.getSystemPrompt()}\n\nCURRENT ITEM: "${item}"\nGOAL: Generate ad copy and save to results.json.`;
                const workerResponse = await callAI(localServerOk ? 'api' : 'gemini', workerPrompt);
                
                // Auto-save each result to the sandbox via CMD
                await auraFlow.runCommand(`echo "${item}: ${workerResponse.replace(/"/g, "'")}" >> aura_workspace/batch_results.txt`);
                
                batchContext += `✅ **[${completed}/${queue.length}]**: ${item} - DONE\n`;
                
                window.electronAPI.send('toMain', { 
                    type: 'assistant-update', 
                    html: batchContext 
                });
            }
            response = batchContext + `\n✨ **Batch Finished!** Results saved to \`batch_results.txt\``;
        } else {
            // Standard Single-Agent Flow
            if (localServerOk) {
                response = await callAI('api', finalPrompt || '');
            } else {
                response = await callAI('gemini', finalPrompt || '');
            }
        }
        
        // --- Aura-Flow Autonomous Command Handling ---
        if (isFlowMode) {
            // Handle RUN_CMD: [command]
            const cmdMatch = response.match(/RUN_CMD:\s*(.*)/);
            if (cmdMatch) {
                const cmd = cmdMatch[1].trim();
                console.log(`AuraFlow: Executing command: ${cmd}`);
                const cmdResult = await auraFlow.runCommand(cmd);
                response += `\n\n> ⚡ **Executed**: \`${cmd}\`\n> ${cmdResult.success ? '✅ Success' : '❌ Error'}\n\`\`\`\n${cmdResult.stdout || cmdResult.stderr}\n\`\`\``;
            }
        }
        
        // Parse Vocab from the hidden tag
        const vocabMatch = response.match(/VOCAB_DATA:\s*(.*)/);
        let vocab = [];
        if (vocabMatch) {
            vocab = vocabMatch[1].split(',').map(item => {
                const [word, translation, definition] = item.split('|').map(s => s.trim());
                return { word, translation, definition };
            });
            response = response.replace(/VOCAB_DATA:.*/s, '').trim(); // Remove the data tag from UI
        }
        
        // Update assistant with AI result
        window.electronAPI.send('toMain', { 
            type: 'assistant-update', 
            html: response,
            vocab: vocab
        });

        if (bubbleLoader) bubbleLoader.style.display = 'none';
        if (bubbleInner) bubbleInner.innerHTML = `
            <div style="font-size: 0.8em; opacity: 0.6; margin-bottom: 5px;">[ ${isSentence ? "Sentence" : "Word"} Analysis ]</div>
            ${response}
        `;
        
        // 5. Auto-Speak
        if (settings.lookupperAutoSpeak) triggerTTS(text);
        
        // 6. Update Memory (History)
        updateWordMemory(text);

        // Auto-hide logic handled by assistant window or timer
    } catch (e) {
        console.error("AI Error:", e);
        // If Layer 2 fails, we still have Layer 1 visible!
        window.electronAPI.send('toMain', { 
            type: 'assistant-update', 
            html: `<div style="font-size: 0.8rem; opacity: 0.7;">⚠️ Smart analysis failed. (Error: ${e.message})</div>` 
        });
        if (bubbleLoader) bubbleLoader.style.display = 'none';
    }
}

function updateWordMemory(text) {
    const word = text.toLowerCase().trim();
    if (!word || word.length < 1) return;
    
    if (!settings.lookupperMemory) settings.lookupperMemory = {};
    if (!settings.lookupperMemory[word]) {
        settings.lookupperMemory[word] = { count: 0, firstSeen: new Date().toISOString(), isFavorite: false };
    }
    settings.lookupperMemory[word].count++;
    settings.lookupperMemory[word].lastSeen = new Date().toISOString();
    saveSettings();
}

async function callAI(provider, promptText) {
    // [EN] Smart Switch Logic
    // [TH] ระบบสลับ AI อัตโนมัติ: ลองเครื่องก่อน ถ้าไม่ได้ค่อยไป Cloud
    const localEndpoint = (settings.localAIEndpoint || "http://127.0.0.1:11434").trim();
    
    // 1. Try Local AI first
    try {
        console.log("[Aura Smart] Attempting Local AI...");
        const result = await fetchLocalAIResponse(localEndpoint, promptText);
        if (result) return result;
    } catch (err) {
        console.warn("[Aura Smart] Local AI failed, trying Cloud fallback...", err);
    }

    // 2. Fallback to OpenRouter if Key exists
    if (settings.openRouterKey) {
        try {
            console.log("[Aura Smart] Attempting OpenRouter Fallback...");
            const result = await fetchOpenRouterDirect(promptText);
            return result;
        } catch (err) {
            console.error("[Aura Smart] Cloud fallback also failed.", err);
        }
    }

    throw new Error("Could not connect to any AI. Please check if Ollama is running or add an OpenRouter Key.");
}

async function fetchLocalAIResponse(endpoint, promptText) {
    const modelSelector = document.getElementById('api-model-selector');
    const selectedModel = modelSelector ? modelSelector.value : 'llama3.2';

    let apiUrl = endpoint;
    if (!apiUrl.startsWith('http')) apiUrl = `http://${apiUrl}`;
    if (!apiUrl.match(/\/v1\/chat\/completions\/?$/)) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/v1/chat/completions`;
    }

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: promptText }],
            stream: false
        })
    });

    if (!response.ok) throw new Error(`Local Status ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content;
}

async function fetchOpenRouterDirect(promptText) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${settings.openRouterKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite-preview-001:free", // Default reliable free model
            messages: [{ role: "user", content: promptText }]
        })
    });
    if (!response.ok) throw new Error(`Cloud Status ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content;
}

async function translateWithGoogle(text, targetLang = 'th') {
    try {
        // Unofficial Google Translate API endpoint (Free)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Google Translate Error");
        const data = await response.json();
        return data[0].map(x => x[0]).join('');
    } catch (e) {
        console.error("Google Translate error:", e);
        throw new Error("Free translation failed. Check internet or add OpenRouter Key.");
    }
}

function hideLookupperBubble() {
    lookupperBubble?.classList.add('hidden');
}

document.getElementById('btn-close-bubble')?.addEventListener('click', hideLookupperBubble);

document.getElementById('btn-trigger-lookupper')?.addEventListener('click', () => {
    window.electronAPI.send('toMain', { type: 'lookupper-capture' });
    showToast("🔍 Aura is checking your screen...");
});

// Draggable Bubble Logic
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

const bubbleHeader = lookupperBubble?.querySelector('.bubble-header');
bubbleHeader?.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    if (e.target === bubbleHeader || bubbleHeader?.contains(e.target)) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, lookupperBubble);
    }
}

function setTranslate(xPos, yPos, el) {
    if (el) el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

// Escape to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideLookupperBubble();
});

// Notion Integration
async function saveToNotion(content) {
    if (!navigator.onLine) {
        addToNotionQueue(content);
        showToast("🔌 Offline. Saved to queue for later.");
        return false;
    }

    try {
        const result = await attemptNotionSync(content);
        if (result && result.ok) {
            // --- Notion Undo Implementation ---
            const undoToast = document.getElementById('notion-undo-toast');
            const undoBtn = document.getElementById('btn-notion-undo');
            if (undoToast && undoBtn) {
                undoToast.classList.remove('hidden');
                undoBtn.onclick = async () => {
                    await deleteNotionPage(result.id);
                    undoToast.classList.add('hidden');
                    showToast("🗑️ Notion Entry Removed");
                };
                setTimeout(() => undoToast.classList.add('hidden'), 5000);
            }
        }
        return result.ok;
    } catch (e) {
        addToNotionQueue(content);
        showToast("📓 Notion Sync Error. Saved to queue.");
        return false;
    }
}

async function attemptNotionSync(content, retryCount = 0) {
    const url = 'https://api.notion.com/v1/pages';
    const body = {
        parent: { database_id: settings.notionDatabaseId },
        properties: {
            Name: { title: [{ text: { content: "Aura Lookup: " + new Date().toLocaleDateString() } }] }
        },
        children: [{
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: content } }] }
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.notionApiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const data = await response.json();
            return { ok: true, id: data.id };
        }

        if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Notion Retry ${retryCount + 1} after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return await attemptNotionSync(content, retryCount + 1);
        }
        return { ok: false };
    } catch (e) {
        if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(r => setTimeout(r, delay));
            return await attemptNotionSync(content, retryCount + 1);
        }
        throw e;
    }
}

function addToNotionQueue(content) {
    let queue = JSON.parse(localStorage.getItem('notion_queue') || '[]');
    queue.push({ content, timestamp: new Date().toISOString() });
    localStorage.setItem('notion_queue', JSON.stringify(queue));
}

window.addEventListener('online', async () => {
    let queue = JSON.parse(localStorage.getItem('notion_queue') || '[]');
    if (queue.length === 0) return;

    showToast(`🔄 Syncing ${queue.length} items to Notion...`);
    let remaining = [];
    for (const item of queue) {
        const success = await attemptNotionSync(item.content);
        if (!success) remaining.push(item);
    }
    localStorage.setItem('notion_queue', JSON.stringify(remaining));
    if (remaining.length === 0) showToast("📓 Notion Sync Complete!");
});

function triggerTTS(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    window.speechSynthesis.speak(utterance);
}

document.getElementById('btn-bubble-notion')?.addEventListener('click', async () => {
    const content = bubbleInner?.innerText;
    if (!content) return;

    if (!settings.notionApiKey || !settings.notionDatabaseId) {
        showToast("⚠️ Please configure Notion settings first!");
        return;
    }

    const btn = document.getElementById('btn-bubble-notion');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    
    const success = await saveToNotion(content);
    if (success) {
        showToast("✅ Saved to Notion!");
        btn.innerHTML = '✅';
    } else {
        btn.innerHTML = originalText;
    }
});

// --- [EN] Critical Window UI Controls (Must be first for reliability) ---
// [TH] ตัวควบคุมหน้าต่างที่สำคัญ (ต้องอยู่ลำดับแรกเพื่อความน่าเชื่อถือ)
const btnMinWin = document.getElementById('btn-min-win');
const btnMaxWin = document.getElementById('btn-max-win');
const btnCloseWin = document.getElementById('btn-close-win');

if (btnMinWin) btnMinWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'minimize' });
if (btnMaxWin) btnMaxWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'maximize' });
if (btnCloseWin) btnCloseWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'close' });

// Minimal Mode Toggle
const btnMiniMode = document.getElementById('btn-mini-mode');
const btnMinimalSidebar = document.getElementById('btn-minimal-toggle');
const toggleMinimal = () => {
    document.body.classList.toggle('minimal-ui');
    const isMinimal = document.body.classList.contains('minimal-ui');
    if (btnMiniMode) btnMiniMode.innerHTML = isMinimal ? '🔙 Full UI' : '🏙️ Small UI';
    showToast(isMinimal ? "🏙️ Focus Mode: Sidebar Hidden" : "🏠 Standard Mode: Sidebar Visible");
};
if (btnMiniMode) btnMiniMode.onclick = toggleMinimal;
if (btnMinimalSidebar) btnMinimalSidebar.onclick = toggleMinimal;

// Sidebar Collapsible Logic
const toggleAddons = document.getElementById('toggle-addons');
const addonsContent = document.getElementById('addons-collapsible');
if (toggleAddons && addonsContent) {
    toggleAddons.onclick = () => {
        toggleAddons.classList.toggle('collapsed');
        // Animation is handled by CSS (max-height)
    };
}

// Smart Hub Target Badge Logic
function updateInputTargetBadge() {
    const badge = document.getElementById('input-target-badge');
    if (!badge) return;
    
    const activePanels = document.querySelectorAll('.view-panel:not(.hidden)');
    if (activePanels.length === 0) {
        badge.innerHTML = "→ NONE ⚪";
        badge.classList.add('hidden');
        document.getElementById('hub-input').placeholder = "Open a workspace to begin...";
    } else if (activePanels.length === 1) {
        const name = activePanels[0].querySelector('.view-title').textContent;
        badge.innerHTML = `→ ${name} 🟢`;
        badge.classList.remove('hidden');
        document.getElementById('hub-input').placeholder = `Ask ${name}... (Ctrl+H)`;
    } else {
        badge.innerHTML = `→ ALL (${activePanels.length}) 🔵`;
        badge.classList.remove('hidden');
        document.getElementById('hub-input').placeholder = `Broadcast to ${activePanels.length} AIs... (Ctrl+Shift+H)`;
    }
}
// Call whenever panels change
const observer = new MutationObserver(updateInputTargetBadge);
observer.observe(document.getElementById('webview-container'), { attributes: true, subtree: true, attributeFilter: ['class'] });

// Global registries
let currentUser = null;
window.USER_DOC_REF = null;
let lastPrompt = '';

const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmitBtn = document.getElementById('btn-auth-submit');
const authGoogleBtn = document.getElementById('btn-auth-google');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleMessage = document.getElementById('auth-toggle-message');
const authTitle = document.getElementById('auth-title');
const authUsernameGroup = document.getElementById('username-group');
const authUsername = document.getElementById('auth-username');
const emailLabel = document.getElementById('email-label');

// Hub Logic Constants
const hubInput = document.getElementById('hub-input');
const quickChips = document.getElementById('quick-chips');
const btnSendRaw = document.getElementById('btn-send-raw');
const btnBroadcast = document.getElementById('btn-broadcast');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const hubAISelector = document.getElementById('hub-ai-selector');
const globalSubject = document.getElementById('global-subject');

// Mode Button Constants (Legacy/Hardcoded)
const btnGeneral = document.getElementById('btn-general');
const btnEcommerce = document.getElementById('btn-ecommerce');
const btnJapanese = document.getElementById('btn-japanese');
const btnGraphicDesign = document.getElementById('btn-graphic-design');

// --- Global UI Registry ---
const panels = {
    gemini: document.getElementById('panel-gemini'),
    chatgpt: document.getElementById('panel-chatgpt'),
    claude: document.getElementById('panel-claude'),
    deepseek: document.getElementById('panel-deepseek'),
    leonardo: document.getElementById('panel-leonardo'),
    bing: document.getElementById('panel-bing'),
    perplexity: document.getElementById('panel-perplexity'),
    grok: document.getElementById('panel-grok'),
    duck: document.getElementById('panel-duck'),
    api: document.getElementById('panel-api'),
    custom: document.getElementById('panel-custom'),
    dashboard: document.getElementById('panel-dashboard')
};

const webviews = {
    gemini: document.getElementById('wv-gemini'),
    chatgpt: document.getElementById('wv-chatgpt'),
    claude: document.getElementById('wv-claude'),
    deepseek: document.getElementById('wv-deepseek'),
    leonardo: document.getElementById('wv-leonardo'),
    bing: document.getElementById('wv-bing'),
    perplexity: document.getElementById('wv-perplexity'),
    grok: document.getElementById('wv-grok'),
    duck: document.getElementById('wv-duck'),
    custom: document.getElementById('wv-custom')
};

const promptList = document.getElementById('prompt-list');
// [REMOVED DUPLICATE]
const settingsOverlay = document.getElementById('settings-overlay');
const quickSwitcherOverlay = document.getElementById('quick-switcher-overlay');
const quickSwitcherInput = document.getElementById('quick-switcher-input');
const quickSwitcherResults = document.getElementById('quick-switcher-results');

const btnOpenStore = document.getElementById('btn-open-store');
const btnCloseStore = document.getElementById('btn-close-store');
const btnDoneStore = document.getElementById('btn-done-store');

function updateAddonSlotUI() {
    if (!storeOverlay) return;
    const buttons = storeOverlay.querySelectorAll('.btn-addon-toggle');
    buttons.forEach(btn => {
        const id = btn.getAttribute('data-addon');
        const active = isAddonActive(id);
        const installed = settings.addons && settings.addons[id] && settings.addons[id].installed;

        if (active) {
            btn.innerText = "✓ Enabled";
            btn.style.background = "rgba(16, 185, 129, 0.15)";
            btn.style.color = "#10b981";
            btn.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        } else if (installed) {
            btn.innerText = "🔌 Enable Now";
            btn.style.background = "var(--accent)";
            btn.style.color = "white";
            btn.style.border = "none";
        } else {
            btn.innerText = "📥 Install";
            btn.style.background = "var(--accent)";
            btn.style.color = "white";
            btn.style.border = "none";
        }
    });
}

// [MOVED TO PLATFORM CORE]

function refreshModularUI() {
    if (!settings.addons) return;
    
    // 1. Gating AI Hub (Dynamic Toggles & Layout)
    const togglesContainer = document.getElementById('dynamic-toggles');
    const layoutControl = document.querySelector('.layout-controls');
    const hasHub = isAddonActive('aiHub');
    
    if (togglesContainer) togglesContainer.style.display = hasHub ? 'flex' : 'none';
    if (layoutControl) layoutControl.style.display = hasHub ? 'flex' : 'none';
    if (hasHub && typeof renderToggles === 'function') renderToggles();

    // 2. Gating Translate Overlay (Sidebar Button)
    const trans = settings.addons.translateOverlay;
    const btnTrans = document.getElementById('btn-trigger-lookupper');
    const btnOld = document.getElementById('btn-open-lookupper');
    const hasTrans = isAddonActive('translateOverlay');

    if (btnTrans) {
        if (hasTrans) btnTrans.classList.remove('hidden');
        else btnTrans.classList.add('hidden');
    }
    if (btnOld) btnOld.style.display = hasTrans ? 'flex' : 'none';

    // 3. Local AI Gating
    const local = settings.addons.localAI;
    const apiOption = document.querySelector('#hub-ai-selector option[value="api"]');
    const proUtils = document.getElementById('pro-utilities');
    const hasLocal = isAddonActive('localAI');
    
    if (apiOption) apiOption.style.display = hasLocal ? 'block' : 'none';
    if (proUtils) proUtils.style.display = hasLocal ? 'flex' : 'none';
    
    if (!hasLocal && settings.provider === 'api') {
        settings.provider = 'gemini';
    }
}

function openStore() {
    if (storeOverlay) {
        updateAddonSlotUI();
        storeOverlay.classList.remove('hidden');
    }
}

if (btnOpenStore) btnOpenStore.onclick = openStore;
if (btnCloseStore) btnCloseStore.onclick = () => storeOverlay.classList.add('hidden');
if (btnDoneStore) btnDoneStore.onclick = () => storeOverlay.classList.add('hidden');

// Global Delegate for Add-on Toggles
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-addon-toggle')) {
        const btn = e.target;
        const id = btn.getAttribute('data-addon');
        const addon = settings.addons[id] || { installed: false, enabled: false };

        if (!addon.installed) {
            // "Installing" Visual State
            btn.innerText = "⏳ Installing...";
            btn.style.opacity = "0.7";
            btn.style.pointerEvents = "none";

            setTimeout(() => {
                if (id === 'localAI') {
                    showLocalAISetupModal();
                    storeOverlay.classList.add('hidden');
                } else {
                    updateAddonState(id, { installed: true, enabled: true });
                    showToast(`✨ Aura AI: ${id} Ready!`);
                    
                    // On-Action Highlight: Pulse relevant labels
                    if (id === 'translateOverlay') {
                        showToast("💡 Pro Tip: Press Alt+Q anywhere to translate.");
                    }
                    
                    updateAddonSlotUI();
                }
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }, 800); // Fast feeling installation
        } else {
            // "Toggle" Logic
            updateAddonState(id, { enabled: !addon.enabled });
            showToast(`🔌 ${id} ${!addon.enabled ? 'Enabled' : 'Disabled'}`);
            if (!addon.enabled && id === 'translateOverlay') {
                showToast("🎯 Press Alt+Q to start translating.");
            }
            updateAddonSlotUI();
        }
        
        if (typeof renderSidebar === 'function') renderSidebar(); 
    }
});

let isSignUpMode = false;

const btnForgot = document.getElementById('btn-forgot-password');
if (authToggleLink) {
    authToggleLink.onclick = (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        if (authError) authError.classList.add('hidden');
        if (isSignUpMode) {
            if (authSubmitBtn) authSubmitBtn.innerText = "Create Account";
            if (authToggleMessage) authToggleMessage.innerText = "Already have an account?";
            if (authToggleLink) authToggleLink.innerText = "Sign In";
            if (btnForgot) btnForgot.style.display = 'none';
            if (authUsernameGroup) authUsernameGroup.classList.remove('hidden');
            if (emailLabel) emailLabel.innerText = "Email";
            if (authEmail) authEmail.placeholder = "you@example.com";
        } else {
            if (authSubmitBtn) authSubmitBtn.innerText = "Sign In";
            if (authToggleMessage) authToggleMessage.innerText = "Don't have an account?";
            if (authToggleLink) authToggleLink.innerText = "Sign Up";
            if (btnForgot) btnForgot.style.display = 'block';
            if (authUsernameGroup) authUsernameGroup.classList.add('hidden');
            if (emailLabel) emailLabel.innerText = "Email or Username";
            if (authEmail) authEmail.placeholder = "you@example.com or username";
        }
    };
}

if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        if (!email) {
            showError("Please enter your email address first.");
            return;
        }

        try {
            btnForgot.innerText = "⏳ Processing...";
            await sendPasswordResetEmail(auth, email);
            showToast("📧 Password reset email sent! Check your inbox.");
            btnForgot.innerText = "Forgot Password?";
        } catch (error) {
            showError(error.message.replace('Firebase: ', ''));
            btnForgot.innerText = "Forgot Password?";
        }
    });
}

function showError(msg) {
    console.error("Auth Error:", msg);
    if (authError) {
        authError.innerText = msg;
        authError.classList.remove('hidden');
    } else {
        showToast("❌ " + msg);
    }
}

// Email/Password Submit
if (authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        
        if (!authEmail || !authPassword) {
            console.error("Required auth fields missing in DOM.");
            return;
        }

        let email = authEmail.value.trim();
        const password = authPassword.value;
        const username = authUsername ? authUsername.value.trim().toLowerCase() : '';
        
        if (authError) authError.classList.add('hidden');

        if (!email) {
            showError("Please enter your email or username.");
            return;
        }
        if (!password) {
            showError("Please enter your password.");
            return;
        }

        try {
            if (authSubmitBtn) {
                authSubmitBtn.disabled = true;
                authSubmitBtn.innerText = "⏳ Processing...";
            }
            
            if (isSignUpMode) {
                // If username provided, check uniqueness
                if (username) {
                    const q = query(collection(db, "usernames"), where("username", "==", username));
                    const snap = await getDocs(q);
                    if (!snap.empty) throw new Error("Username already taken.");
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Store username mapping
                if (username) {
                    await setDoc(doc(db, "usernames", username), { email: email.toLowerCase() });
                }

                await sendEmailVerification(userCredential.user);
                showToast("📧 Verification email sent! Please check your inbox.");
            } else {
                // SIGN IN: Check if it's a username
                if (!email.includes('@')) {
                    const usernameDoc = await getDoc(doc(db, "usernames", email.toLowerCase()));
                    if (usernameDoc.exists()) {
                        email = usernameDoc.data().email;
                    } else {
                        throw new Error("Username not found.");
                    }
                }
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            showError(error.message.replace('Firebase: ', ''));
        } finally {
            if (authSubmitBtn) {
                authSubmitBtn.disabled = false;
                authSubmitBtn.innerText = isSignUpMode ? "Create Account" : "Sign In";
            }
        }
    };
}

// Resend Verification
const btnResendVerify = document.getElementById('btn-resend-verification');
if (btnResendVerify) {
    btnResendVerify.onclick = async () => {
        if (auth.currentUser) {
            try {
                await sendEmailVerification(auth.currentUser);
                showToast("📧 Verification email resent!");
            } catch (e) {
                showToast("⚠️ Please wait before resending.");
            }
        }
    };
}

// Cancel Verification (Sign Out to try again)
const btnCancelVerify = document.getElementById('btn-cancel-verify');
if (btnCancelVerify) {
    btnCancelVerify.onclick = async () => {
        await signOut(auth);
        window.location.reload();
    };
}

if (authGoogleBtn) {
    authGoogleBtn.onclick = async () => {
        if (authError) authError.classList.add('hidden');
        
        // [EN] Professional way: Official Google OAuth flow for Desktop Apps
        // [TH] วิธีแบบมือโปร: ใช้ระบบ Google OAuth ของจริงสำหรับแอป Desktop ครับ มั่นใจได้ 100%
        const GOOGLE_CLIENT_ID = "526063420718-8op2v9l03dclb4hno1oe1svmtp1442f2.apps.googleusercontent.com";
        const REDIRECT_URI = "http://localhost:3000";
        
        window.electronAPI.send('toMain', { type: 'start-auth-server' });
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
            `client_id=${GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${REDIRECT_URI}&` +
            `response_type=id_token&` + // Direct ID token for Firebase
            `scope=openid%20profile%20email&` +
            `nonce=${Math.random().toString(36).substring(2)}`;
        
        window.electronAPI.send('toMain', { type: 'open-external-url', url: authUrl });
        
        showToast("🌐 Redirecting to Google Login...");
    };
}

// Listen for messages from main process
window.electronAPI.receive('fromMain', async (data) => {
    if (data.type === 'deep-link') {
        processDeepLink(data.url);
    } else if (data.type === 'auth-success') {
        // From Local Loopback Server
        completeGoogleSignIn(data.idToken);
    } else if (data.type === 'capture-success') {
        // Success notification for screenshots
        const isMac = window.electronAPI && window.electronAPI.isMac;
        const pasteKey = isMac ? '⌘+V' : 'Ctrl+V';
        showToast(`✅ Capture Success!\n[TH] ก๊อปรูปลง Clipboard แล้วครับ กด ${pasteKey} ที่แชทได้เลย!`);
    } else if (data.type === 'external-trigger') {
        // [Phase 14] Aura-Systems: Handle remote signals (Discord, Python, etc.)
        // [TH] รับสัญญาณรีโมทจากภายนอก (Discord Bot / Script)
        console.log("Aura-Systems: External Trigger Received:", data);
        showToast(`📡 Remote Signal Received!\nTrigger: ${data.skillName}\nInput: ${data.input.slice(0, 40)}${data.input.length > 40 ? '...' : ''}`);
        
        // [EN] Switch to Local AI panel as high-visibility feedback
        // [TH] สลับไปที่พาเนล Local AI เพื่อให้เห็นการตอบรับ
        if (typeof toggleView === 'function') {
            toggleView('api', true);
        }
    }
});

async function processDeepLink(urlStr) {
    try {
        const url = new URL(urlStr);
        const params = new URLSearchParams(url.search || url.hash.substring(1));
        const idToken = params.get('id_token') || params.get('code');
        if (idToken) completeGoogleSignIn(idToken);
    } catch (e) {
        console.error("Deep Link Error:", e);
    }
}

async function completeGoogleSignIn(idToken) {
    try {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        showToast("✅ Signed in with Google!");
    } catch (error) {
        showError("Google Auth Error: " + error.message);
    }
}

// Sidebar Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = async () => {
        if (confirm("Are you sure you want to sign out?")) {
            await signOut(auth);
            window.location.reload();
        }
    };
}

// Sidebar Settings
const btnSettings = document.getElementById('btn-settings');
if (btnSettings) {
    btnSettings.onclick = () => {
        if (settingsOverlay) {
            applySettingsToUI();
            settingsOverlay.classList.remove('hidden');
        }
    };
}

// Sidebar Theme Toggle
const btnThemeToggleInFooter = document.getElementById('btn-theme-toggle');
if (btnThemeToggleInFooter) {
    btnThemeToggleInFooter.onclick = () => {
        settings.theme = (settings.theme === 'light') ? 'dark' : 'light';
        localStorage.setItem('aura_settings', JSON.stringify(settings));
        applySettingsToUI();
        showToast(`✨ Theme switched to ${settings.theme} mode`);
    };
}

// Listen for Auth State Changes
onAuthStateChanged(auth, async (user) => {
    const verifySection = document.getElementById('verify-email-section');
    if (user) {
        // User is signed in
        if (!user.emailVerified) {
            // Must verify!
            if (verifySection) verifySection.classList.remove('hidden');
            if (authForm) authForm.classList.add('hidden');
            if (authTitle) authTitle.innerText = "Check your Email";

            // Periodically check if verified if they haven't refreshed
            const checkInterval = setInterval(async () => {
                await user.reload();
                if (user.emailVerified) {
                    clearInterval(checkInterval);
                    window.location.reload(); // Refresh to enter
                }
            }, 3000);
            return;
        }

        currentUser = user;
        window.USER_DOC_REF = doc(db, "users", user.uid);
        if (authOverlay) authOverlay.classList.add('hidden');
        
        // --- Webview Isolation Restore ---
        const wvContainer = document.getElementById('webview-container');
        if (wvContainer) wvContainer.classList.remove('hidden');

        showToast(`👋 Welcome back, ${user.email || 'Pro User'}!`);

        // Initialize App Setup only after login
        loadSettings();
        if (window.electronAPI && window.electronAPI.getAppVersion) {
            const versionEl = document.getElementById('current-version');
            if (versionEl) {
                window.electronAPI.getAppVersion().then(v => {
                    versionEl.innerText = `v${v}`;
                }).catch(() => {
                    // ignore
                });
            }
        }
        switchMode(settings.currentMode || 'general');
    } else {
        // User is signed out
        currentUser = null;
        window.USER_DOC_REF = null;
        if (authOverlay) authOverlay.classList.remove('hidden'); // Show login screen
        if (authForm) authForm.classList.remove('hidden');
        if (verifySection) verifySection.classList.add('hidden');
        if (authTitle) authTitle.innerText = "Welcome to Aura AI";

        // --- Webview Isolation (Emergency Fix for Mouse Interference) ---
        const wvContainer = document.getElementById('webview-container');
        if (wvContainer) wvContainer.classList.add('hidden');

        // Force focus to start typing immediately
        setTimeout(() => {
            const emailInp = document.getElementById('auth-email');
            if (emailInp) emailInp.focus();
        }, 100);
    }
});

// Toast Notification System (L้ำๆ)
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Keep screen clean: only show one toast at a time
    while (container.firstChild) container.removeChild(container.firstChild);

    const toast = document.createElement('div');
    toast.className = 'toast';

    // Limit message length to avoid overflowing the screen
    const maxLen = 160;
    const safeMsg = (typeof message === 'string' ? message : String(message)).trim();
    toast.innerHTML = (safeMsg.length > maxLen ? safeMsg.slice(0, maxLen) + '…' : safeMsg).replace(/\n/g, '<br>');
    container.appendChild(toast);

    // Auto remove with animation
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.5s forwards';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, 3500);
}

// --- Add event listeners for webview loading states (Status Indicator) ---
// --- Add event listeners for webview loading states (Status Indicator) ---
if (webviews && panels) {
    Object.keys(webviews).forEach(provider => {
        const wv = webviews[provider];
        const panel = panels[provider];
        if (wv && panel) {
            const dot = panel.querySelector('.status-dot');
            if (dot) {
                wv.addEventListener('did-start-loading', () => {
                    dot.classList.add('loading');
                    dot.classList.remove('error');
                });
                wv.addEventListener('did-stop-loading', () => {
                    dot.classList.remove('loading');
                });
                wv.addEventListener('did-fail-load', () => {
                    dot.classList.remove('loading');
                    dot.classList.add('error');
                });
            }
        }
    });
}

// Panel Toggle Logic
function toggleView(provider, show) {
    const panel = panels[provider];
    const btn = document.querySelector(`.ai-toggle[data-provider="${provider}"]`);
    if (!panel) return;

    if (show) {
        panel.classList.remove('hidden');
        if (btn) btn.classList.add('active');
        // Custom tab button highlight
        const tabBtn = document.getElementById(`btn-tab-${provider}`);
        if (tabBtn) tabBtn.classList.add('active');

        // Lazy load webview src to prevent Chromium crash on startup
        const wv = panel.querySelector('webview');
        if (wv && !wv.src && wv.getAttribute('data-src')) {
            wv.src = wv.getAttribute('data-src');
            console.log(`[Aura AI] Lazy loaded webview for: ${provider}`);
        }

        // Design Toolbar for Graphic Design Mode (Limited to Inspiration & Custom Workspace only)
        const isDesignTool = provider === 'custom' || provider.startsWith('custom-');
        if (settings.currentMode === 'graphic-design' && isDesignTool) {
            injectGDToolbarToPanel(panel);
        }
        
        // Hide dashboard if any panel is shown
        if (panels.dashboard) panels.dashboard.classList.add('hidden');
    } else {
        panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        const tabBtn = document.getElementById(`btn-tab-${provider}`);
        if (tabBtn) tabBtn.classList.remove('active');

        // Check if all panels are hidden, if so show dashboard
        const anyVisible = Object.entries(panels).some(([id, p]) => id !== 'dashboard' && p && !p.classList.contains('hidden'));
        if (!anyVisible && panels.dashboard) {
            panels.dashboard.classList.remove('hidden');
        }
    }
}

function saveLayoutState() {
    const container = document.getElementById('webview-container');
    const domPanels = Array.from(container.querySelectorAll('.view-panel'));
    settings.panelOrder = domPanels.map(p => p.getAttribute('data-id'));

    // Save panel width or mode properties generically
    const activePanels = domPanels.filter(p => !p.classList.contains('hidden')).map(p => p.getAttribute('data-id'));
    if (settings.currentMode) {
        settings.layouts[settings.currentMode] = activePanels;
    }

    const layoutSelect = document.getElementById('layout-style');
    if (layoutSelect) settings.layoutStyle = layoutSelect.value;

    localStorage.setItem('aura_settings', JSON.stringify(settings));
    renderToggles(); // Re-render toggles to match new order easily!
}

// Layout Mode Select Logic
const layoutSelect = document.getElementById('layout-style');
if (layoutSelect) {
    layoutSelect.addEventListener('change', (e) => {
        applyLayoutStyle(e.target.value);
        saveLayoutState();
    });
}
function applyLayoutStyle(style) {
    const container = document.getElementById('webview-container');
    container.classList.remove('layout-scroll', 'layout-grid', 'layout-split');
    container.classList.add(`layout-${style}`);
    if (layoutSelect) layoutSelect.value = style;
}

// [REMOVED DUPLICATE DECLARATION]

// Remove hardcoded top toggles logic and replace with dynamic function
function renderToggles() {
    const container = document.getElementById('dynamic-toggles');
    if (!container) return;
    container.innerHTML = '';

    const names = {
        gemini: 'Gemini', chatgpt: 'ChatGPT', claude: 'Claude',
        deepseek: 'DeepSeek', leonardo: 'Leonardo AI', 
        bing: 'Bing', perplexity: 'Perplexity', grok: 'Grok', duck: 'DuckAI',
        api: '🌟 Aura Pro', 
        custom: (settings.currentMode === 'graphic-design') ? '🎨 Inspiration' : (settings.customAIName || 'Custom AI')
    };

    // Add custom tab names
    if (settings.customTabs) {
        settings.customTabs.forEach(tab => {
            names[tab.id] = tab.name;
        });
    }

    settings.panelOrder.forEach(provider => {
        if (provider === 'gemini' && settings.showGemini === false) return;
        if (provider === 'chatgpt' && settings.showChatGPT === false) return;
        if (provider === 'claude' && settings.showClaude === false) return;
        if (provider === 'deepseek' && settings.showDeepSeek === false) return;
        if (provider === 'leonardo' && settings.showLeonardo === false) return;
        if (provider === 'bing' && settings.showBing === false) return;
        if (provider === 'perplexity' && settings.showPerplexity === false) return;
        if (provider === 'grok' && settings.showGrok === false) return;
        if (provider === 'duck' && settings.showDuck === false) return;
        if (provider === 'custom' && !settings.showCustomAI) return;
        if (provider === 'api' && !settings.useApiMode) return; 

        const btn = document.createElement('button');
        btn.className = 'ai-toggle';
        btn.setAttribute('data-provider', provider);
        btn.innerText = names[provider] || provider;

        if (settings.layouts[settings.currentMode] && settings.layouts[settings.currentMode].includes(provider)) {
            btn.classList.add('active');
        }

        btn.onclick = (e) => {
            const isCurrentlyActive = btn.classList.contains('active');
            toggleView(provider, !isCurrentlyActive);
            saveLayoutState();
        };
        container.appendChild(btn);
    });
}

// Panel controls (Move Left, Move Right, Close)
document.getElementById('webview-container').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const panel = btn.closest('.view-panel');
    if (!panel) return;
    const provider = panel.getAttribute('data-id');

    if (btn.classList.contains('btn-close-panel')) {
        toggleView(provider, false);
        saveLayoutState();
    } else if (btn.classList.contains('btn-move-left')) {
        if (panel.previousElementSibling) {
            panel.parentNode.insertBefore(panel, panel.previousElementSibling);
            saveLayoutState();
        }
    } else if (btn.classList.contains('btn-move-right')) {
        if (panel.nextElementSibling) {
            panel.parentNode.insertBefore(panel.nextElementSibling, panel);
            saveLayoutState();
        }
    } else if (btn.classList.contains('btn-reload')) {
        const wv = webviews[provider];
        if (wv) wv.reload();
    } else if (btn.classList.contains('btn-regen')) {
        if (lastPrompt) {
            injectToSpecificAI(provider, lastPrompt);
        } else {
            showToast("⚠️ No previous prompt to regenerate.");
        }
    } else if (btn.classList.contains('btn-copy-response')) {
        const wv = webviews[provider];
        if (provider === 'api') {
            const container = document.getElementById('api-chat-container');
            const msgs = container.querySelectorAll('.msg-content');
            if (msgs.length > 0) {
                const lastAiMsg = Array.from(msgs).reverse().find(m => m.parentNode.classList.contains('ai-msg'));
                if (lastAiMsg) {
                    navigator.clipboard.writeText(lastAiMsg.innerText);
                    showToast("📋 API Response copied!");
                }
            }
            return;
        }
        if (wv) {
            wv.executeJavaScript(`
                (function() {
                    const snippets = [
                        '.markdown', '.result-streaming', '.message-content', 
                        'article', '.response-block', '.copyable-text', 
                        // Specific for giants
                        'div[data-message-author-role="assistant"]'
                    ];
                    let text = "No response found.";
                    for (const s of snippets) {
                        const els = document.querySelectorAll(s);
                        if (els.length > 0) {
                            text = els[els.length - 1].innerText;
                            break;
                        }
                    }
                    return text;
                })()
            `).then(text => {
                navigator.clipboard.writeText(text);
                showToast("📋 Last response copied to clipboard!");
            }).catch(err => {
                showToast("❌ Copy failed: " + err.message);
            });
        }
    } else if (btn.classList.contains('btn-focus')) {
        const isFullscreen = panel.classList.contains('fullscreen');
        // If not fullscreen, make other things hidden essentially, or just position absolute over everything.
        // We use the .fullscreen CSS class to do this cleanly.
        if (isFullscreen) {
            panel.classList.remove('fullscreen');
            btn.innerText = '⤢';
        } else {
            panel.classList.add('fullscreen');
            btn.innerText = '⤣';
        }
    }
});

// Title bar logic moved to top

// Hide All Panels Logic
const btnHideAll = document.getElementById('btn-hide-all-panels');
if (btnHideAll) {
    btnHideAll.onclick = () => {
        Object.keys(panels).forEach(id => {
            if (id !== 'dashboard') toggleView(id, false);
        });
        saveLayoutState();
    };
}

function getActivePrompts(mode) {
    if (settings.customPrompts && settings.customPrompts[mode]) {
        return settings.customPrompts[mode];
    }
    return defaultPrompts[mode] || [];
}
    // --- Shortcut Helpers ---
function normalizeShortcut(str) {
    if (!str) return '';
    return str
        .replace(/⌘|Command|Meta/gi, 'Cmd')
        .replace(/⌥|Option|Opt/gi, 'Alt')
        .split('+')
        .map(p => p.trim())
        .join('+');
}

function getDisplayKey(str, isMac) {
    if (!str) return '';
    let parts = str.split('+');
    return parts.map(p => {
        const lp = p.toLowerCase();
        // [EN] Command (Mac) / Ctrl (Win)
        if (lp === 'cmd' || lp === 'command' || lp === 'meta' || lp === 'ctrl') return isMac ? 'Command' : 'Ctrl';
        // [EN] Option (Mac) / Alt (Win)
        if (lp === 'alt' || lp === 'option' || lp === 'opt') return isMac ? 'Option' : 'Alt';
        return p;
    }).join('+');
}

function getShortcutLabel(shortcutObj) {
    if (!settings.shortcuts || !settings.shortcuts.enabled || !shortcutObj || !shortcutObj.enabled) return '';
    const isMac = window.electronAPI && window.electronAPI.isMac;
    let label = shortcutObj.key || '';
    
    // Detailed Platform Symbols for Labels
    if (isMac) {
        label = label
            .replace(/Ctrl/gi, '⌃')
            .replace(/Alt/gi, '⌥')
            .replace(/Shift/gi, '⇧')
            .replace(/Cmd|Command|Meta/gi, '⌘');
    }
    
    return `[${label}]`;
}
// Webview references & Injection Logic
// インジェクション (Injection) - การส่งข้อความเข้าช่องพิมพ์โดยตรง
// Hub Logic using consolidated getTargetWebview below

// Hub Logic

if (btnToggleSidebar) {
    btnToggleSidebar.onclick = () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
    };
}

function renderChips(mode) {
    quickChips.innerHTML = '';
    const activePrompts = getActivePrompts(mode);
    activePrompts.forEach((p, index) => {
        const span = document.createElement('span');
        span.className = 'chip';
        // Add Shortcut text
        const shortcut = (index < 5 && settings.shortcuts) ? getShortcutLabel(settings.shortcuts[`p${index + 1}`]) : '';
        span.innerText = p.label + shortcut;
        span.onclick = () => {
            const userInput = hubInput.value.trim();
            const fullPrompt = p.text.replace('[YOUR PRODUCT]', userInput)
                .replace('[YOUR TOPIC]', userInput)
                .replace('[PASTE SENTENCE]', userInput)
                .replace('[YOUR TEXT]', userInput)
                .replace('[YOUR KANJI]', userInput);
            injectToAI(fullPrompt);
        };
        quickChips.appendChild(span);
    });
}

if (btnSendRaw) {
    btnSendRaw.onclick = () => {
        const val = hubInput.value;
        if (val.trim()) {
            injectToAI(val);
            hubInput.value = ''; // Auto clear after sending
        }
    };
}

// Allow pressing Enter to send
if (hubInput) {
    hubInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            injectToAI(hubInput.value);
        }
    });

    // Ctrl+H (Send), Ctrl+Shift+H (Broadcast)
    hubInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            if (e.shiftKey) btnBroadcast.click();
            else btnSendRaw.click();
        }
    });
}

if (hubAISelector) {
    hubAISelector.onchange = (e) => {
        const provider = e.target.value;
        if (provider === 'all') {
            const defaultPanels = settings.layouts[settings.currentMode] || ['gemini', 'chatgpt'];
            defaultPanels.forEach(p => toggleView(p, true));
        } else {
            // Show only the selected one
            Object.keys(panels).forEach(p => {
                if (p !== 'dashboard' && panels[p]) {
                    toggleView(p, p === provider);
                }
            });
        }
        saveLayoutState();
    };
}

if (btnBroadcast) {
    btnBroadcast.onclick = () => {
        const val = hubInput.value.trim();
        if (val) {
            const activePanels = document.querySelectorAll('.view-panel:not(.hidden)');
            if (activePanels.length === 0) {
                showToast("⚠️ No active panels to broadcast to!");
                return;
            }
            activePanels.forEach(p => {
                const id = p.getAttribute('data-id');
                injectToSpecificAI(id, val);
            });
            showToast(`📢 Broadcast sent to ${activePanels.length} AIs!`);
            hubInput.value = '';
        }
    };
}

function triggerPromptShortcut(index) {
    const activePrompts = getActivePrompts(settings.currentMode);
    const p = activePrompts[index];
    if (p) {
        const userInput = hubInput.value.trim();
        if (userInput) {
            const fullPrompt = p.text.replace('[YOUR PRODUCT]', userInput)
                .replace('[YOUR TOPIC]', userInput)
                .replace('[PASTE SENTENCE]', userInput)
                .replace('[YOUR TEXT]', userInput)
                .replace('[YOUR KANJI]', userInput);
            injectToAI(fullPrompt);
        } else {
            navigator.clipboard.writeText(p.text);
            showToast(`✅ Copied Template:\n"${p.text}"`);
        }
    }
}

function renderPrompts(mode) {
    promptList.innerHTML = '';
    const activePrompts = getActivePrompts(mode);
    activePrompts.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        const shortcut = (index < 5 && settings.shortcuts) ? getShortcutLabel(settings.shortcuts[`p${index + 1}`]) : '';
        div.innerText = p.label + shortcut;
        div.title = "Left Click: Copy/Send. Right Click: Edit\n\nPrompt Text:\n" + p.text; // Tooltip showing full text
        div.onclick = () => {
            // Toggle: If input is empty, just copy. If not, inject.
            const userInput = hubInput ? hubInput.value.trim() : '';
            if (userInput) {
                const fullPrompt = p.text.replace('[YOUR PRODUCT]', userInput)
                    .replace('[YOUR TOPIC]', userInput)
                    .replace('[PASTE SENTENCE]', userInput)
                    .replace('[YOUR TEXT]', userInput)
                    .replace('[YOUR KANJI]', userInput);
                injectToAI(fullPrompt);
            } else {
                navigator.clipboard.writeText(p.text);
                showToast(`✅ Copied Template:\n"${p.text}"\n\n[TH] ก๊อปปี้แม่แบบให้แล้ว นำไปวางต่อได้เลยครับ`);
            }
        };
        div.oncontextmenu = (e) => {
            e.preventDefault();
            openPromptModal(index, p.label, p.text);
        };
        promptList.appendChild(div);
    });
    renderChips(mode);
}

function switchMode(mode) {
    if (btnGeneral) btnGeneral.classList.remove('active');
    if (btnEcommerce) btnEcommerce.classList.remove('active');
    if (btnJapanese) btnJapanese.classList.remove('active');

    settings.currentMode = mode;

    // Hide all panels and cleanup toolbars
    Object.keys(panels).forEach(p => {
        toggleView(p, false);
        if (panels[p]) removeGDToolbarFromPanel(panels[p]);
    });

    const btnEditCustomTools = document.getElementById('btn-edit-custom-tools');
    if (btnEditCustomTools) btnEditCustomTools.style.display = (mode === 'graphic-design') ? 'inline-block' : 'none';

    renderPrompts(mode);

    if (mode === 'general') {
        if (btnGeneral) btnGeneral.classList.add('active');
    } else if (mode === 'ecommerce') {
        if (btnEcommerce) btnEcommerce.classList.add('active');
    } else if (mode === 'japanese') {
        if (btnJapanese) btnJapanese.classList.add('active');
    }

    // Highlighting community modes
    const communityBtns = document.querySelectorAll('#community-modes-container button');
    communityBtns.forEach(btn => {
        if (btn.id === `btn-mode-${mode}`) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Restore saved layout or default
    let layout = settings.layouts ? settings.layouts[mode] : null;
    if (layout && layout.length > 0) {
        layout.forEach(p => toggleView(p, true));
    } else {
        // Safe Fallbacks
        if (mode === 'general') { toggleView('gemini', true); toggleView('chatgpt', true); }
        else if (mode === 'ecommerce') { toggleView('gemini', true); toggleView('leonardo', true); }
        else if (mode === 'japanese') { toggleView('gemini', true); toggleView('claude', true); }
        else if (mode === 'graphic-design') {
            // [EN] Graphic Design Pro Setup: Pinterest (Custom AI) + ChatGPT (Prompt Gen) + Leonardo (Image Gen)
            // [TH] การตั้งค่าหน้าจอสำหรับโหมด Graphic Design Pro
            const customTitle = document.getElementById('custom-ai-title');
            if (customTitle) customTitle.innerText = "Inspiration (Pinterest)";
            
            const wvCustom = webviews['custom'];
            const customAddr = document.getElementById('custom-ai-address');
            
            if (wvCustom && (wvCustom.src === 'about:blank' || !wvCustom.src)) {
                const defaultUrl = "https://www.pinterest.com";
                wvCustom.src = defaultUrl;
                if (customAddr) customAddr.value = defaultUrl;
            }

            toggleView('chatgpt', true); // For prompt engineering
            toggleView('leonardo', true); // For image generation
            toggleView('custom', true); // For Pinterest inspiration
            
            applyLayoutStyle('split'); // Force split view
        }
        else {
            // If it's a custom/unknown mode, at least show the first panel if available
            const firstPanel = settings.panelOrder[0] || 'gemini';
            toggleView(firstPanel, true);
        }
    }

    // Apply saved layout style
    applyLayoutStyle(settings.layoutStyle || 'scroll');

    // Restore saved panel order visually
    if (settings.panelOrder && settings.panelOrder.length > 0) {
        const container = document.getElementById('webview-container');
        settings.panelOrder.forEach(id => {
            const p = panels[id];
            if (p) container.appendChild(p); // Reordering the DOM elements
        });
    }

    if (!settings.layouts[mode] || !settings.layouts[mode].includes(settings.provider)) {
        settings.provider = (layout && layout.length > 0) ? layout[0] : 'gemini';
    }

    updateCreativeModeUI(mode); // Toggle professional suite look
    
    localStorage.setItem('aura_settings', JSON.stringify(settings));
}


// Graphic Design Toolbar Logic
document.querySelectorAll('.gd-tool-btn').forEach(btn => {
    btn.onclick = (e) => {
        const url = btn.getAttribute('data-url');
        const wvCustom = webviews['custom'];
        if (wvCustom) wvCustom.src = url;
        
        // Update active state
        document.querySelectorAll('.gd-tool-btn').forEach(b => {
            b.style.background = 'rgba(255,255,255,0.1)';
            b.classList.remove('active');
        });
        btn.style.background = 'var(--accent)';
        btn.classList.add('active');
        
        // Update panel title
        const customTitle = document.getElementById('custom-ai-title');
        if (customTitle) customTitle.innerText = "Inspiration (" + btn.innerText + ")";
    };
});

const btnEcommerceStore = document.getElementById('btn-ecommerce');
const btnJapaneseStore = document.getElementById('btn-japanese');
const btnGraphicDesignStore = document.getElementById('btn-graphic-design');

if (btnGeneral) btnGeneral.addEventListener('click', () => switchMode('general'));
if (btnEcommerce) btnEcommerce.addEventListener('click', () => switchMode('ecommerce'));
if (btnJapanese) btnJapanese.addEventListener('click', () => switchMode('japanese'));
if (btnGraphicDesign) btnGraphicDesign.addEventListener('click', () => switchMode('graphic-design'));

// Window Controls
const chkOnTop = document.getElementById('chk-on-top');
const rngOpacity = document.getElementById('rng-opacity');
const btnScreenshot = document.getElementById('btn-screenshot');

if (chkOnTop) {
    chkOnTop.addEventListener('change', (e) => {
        window.electronAPI.send('toMain', { type: 'set-always-on-top', value: e.target.checked });
    });
}

if (rngOpacity) {
    rngOpacity.addEventListener('input', (e) => {
        window.electronAPI.send('toMain', { type: 'set-opacity', value: parseFloat(e.target.value) });
    });
}

// Screenshot Logic
if (btnScreenshot) {
    btnScreenshot.addEventListener('click', () => {
        window.electronAPI.send('toMain', { type: 'capture-screen' });
        btnScreenshot.innerText = "⌛ Capturing...";
    });
}

// IPC Listeners for Shortcuts from Main Process handled above


// Settings & Persistence Logic
// 設定の管理 (Settei no kanri) - การจัดการการตั้งค่า

function applySettingsToUI() {
    // Check Theme
    if (settings.theme === 'light') {
        document.body.classList.add('light-mode');
        const btnThemeToggle = document.getElementById('btn-theme-toggle');
        if (btnThemeToggle) btnThemeToggle.innerText = '☀️ Light Mode';
    } else {
        document.body.classList.remove('light-mode');
        const btnThemeToggle = document.getElementById('btn-theme-toggle');
        if (btnThemeToggle) btnThemeToggle.innerText = '🌙 Dark Mode';
    }

    // Apply Panel Order
    const container = document.getElementById('webview-container');
    settings.panelOrder.forEach(id => {
        if (panels[id]) container.appendChild(panels[id]);
    });

    // Sync Add-ons Visibility
    if (settings.showEcommerce === false) {
        if (btnEcommerce) btnEcommerce.classList.add('hide-addon');
    } else {
        if (btnEcommerce) btnEcommerce.classList.remove('hide-addon');
    }

    if (settings.showJapanese === false) {
        if (btnJapanese) btnJapanese.classList.add('hide-addon');
    } else {
        if (btnJapanese) btnJapanese.classList.remove('hide-addon');
    }

    if (settings.showGraphicDesign === false) {
        if (btnGraphicDesign) btnGraphicDesign.classList.add('hide-addon');
    } else {
        if (btnGraphicDesign) btnGraphicDesign.classList.remove('hide-addon');
    }

    // Switch to general if the active mode was hidden
    if (settings.currentMode === 'ecommerce' && settings.showEcommerce === false) settings.currentMode = 'general';
    if (settings.currentMode === 'japanese' && settings.showJapanese === false) settings.currentMode = 'general';
    if (settings.currentMode === 'graphic-design' && settings.showGraphicDesign === false) settings.currentMode = 'general';

    // Sync UI
    const inputUsername = document.getElementById('set-username');
    if (inputUsername) inputUsername.value = settings.username || '';

    const inputAlias = document.getElementById('set-alias');
    if (inputAlias) inputAlias.value = settings.communityAlias || '';

    const chkPrefix = document.getElementById('set-use-prefix');
    if (chkPrefix) chkPrefix.checked = settings.usePrefix;
    const txtPrefix = document.getElementById('set-prefix-val');
    if (txtPrefix) txtPrefix.value = settings.prefix;
    const chkSuffix = document.getElementById('set-use-suffix');
    if (chkSuffix) chkSuffix.checked = settings.useSuffix;
    const txtSuffix = document.getElementById('set-suffix-val');
    if (txtSuffix) txtSuffix.value = settings.suffix;
    const chkRead = document.getElementById('set-auto-read');
    if (chkRead) chkRead.checked = settings.autoRead;

    // Shortcuts UI Sync
    if (settings.shortcuts) {
        const chkAll = document.getElementById('set-shortcuts-enabled');
        if (chkAll) chkAll.checked = settings.shortcuts.enabled !== false;

        const isMac = window.electronAPI && window.electronAPI.isMac;
        const syncItem = (id, key) => {
            const chk = document.getElementById(`chk-shortcut-${id}`);
            const input = document.getElementById(`set-shortcut-${id}`);
            if (chk) chk.checked = settings.shortcuts[key].enabled !== false;
            if (input) input.value = getDisplayKey(settings.shortcuts[key].key, isMac);
        };

        syncItem('send', 'send');
        syncItem('broadcast', 'broadcast');
        syncItem('sidebar', 'sidebar');
        syncItem('global', 'global');
        syncItem('p1', 'p1');
        syncItem('p2', 'p2');
        syncItem('p3', 'p3');
        syncItem('p4', 'p4');
        syncItem('p5', 'p5');
    }

    // Local AI & Scan Mode Sync
    const chkScan = document.getElementById('set-scan-mode');
    if (chkScan) chkScan.checked = settings.scanMode || false;
    
    const chkLocal = document.getElementById('set-use-api-mode');
    const chkLocalAddon = document.getElementById('set-use-api-mode-addon');
    if (chkLocal) chkLocal.checked = settings.useApiMode || false;
    if (chkLocalAddon) chkLocalAddon.checked = settings.useApiMode || false;

    // AI Visibility (Always Tab)
    const providers = ['gemini', 'chatgpt', 'claude', 'deepseek', 'leonardo', 'bing', 'perplexity', 'grok', 'duck'];
    providers.forEach(p => {
        const chk = document.getElementById(`set-show-${p}`);
        if (chk) chk.checked = settings[`show${p.charAt(0).toUpperCase() + p.slice(1)}`] !== false;
    });

    // Custom Prompts (Prompts Tab)
    if (settings.customPrompts) {
        for (let i = 1; i <= 8; i++) {
            const lbl = document.getElementById(`p-label-${i}`);
            const cnt = document.getElementById(`p-content-${i}`);
            if (lbl && settings.customPrompts[i-1]) lbl.value = settings.customPrompts[i-1].name || '';
            if (cnt && settings.customPrompts[i-1]) cnt.value = settings.customPrompts[i-1].text || '';
        }
    }

    // Custom AI Sync
    const showCustom = settings.showCustomAI === true;
    const setShowCustom = document.getElementById('set-show-custom');
    if (setShowCustom) setShowCustom.checked = showCustom;

    const setCustomName = document.getElementById('set-custom-name');
    if (setCustomName) setCustomName.value = settings.customAIName || '';

    const setCustomUrl = document.getElementById('set-custom-url');
    if (setCustomUrl) setCustomUrl.value = settings.customAIUrl || '';

    const customAiTitle = document.getElementById('custom-ai-title');
    if (customAiTitle) customAiTitle.innerText = settings.customAIName || 'Custom AI';

    if (showCustom && settings.customAIUrl && webviews.custom && webviews.custom.src !== settings.customAIUrl) {
        webviews.custom.src = settings.customAIUrl;
    }
    if (!showCustom) {
        toggleView('custom', false);
    }

    renderToggles(); // Ensure Dynamic Toggles match the mode, names, and custom AI visibility!

    // Pro Mode state update
    const proUtils = document.getElementById('pro-utilities');
    if (proUtils) proUtils.style.display = settings.useApiMode ? 'flex' : 'none';

    const chkApiMode = document.getElementById('set-use-api-mode');
    const chkApiModeAddon = document.getElementById('set-use-api-mode-addon');
    if (chkApiMode) chkApiMode.checked = settings.useApiMode === true;
    if (chkApiModeAddon) chkApiModeAddon.checked = settings.useApiMode === true;
    const txtApiKey = document.getElementById('set-openrouter-key');
    if (txtApiKey) txtApiKey.value = settings.openRouterKey || '';

    // Visibility Flags Sync
    if (document.getElementById('set-show-gemini')) document.getElementById('set-show-gemini').checked = settings.showGemini !== false;
    if (document.getElementById('set-show-chatgpt')) document.getElementById('set-show-chatgpt').checked = settings.showChatGPT !== false;
    if (document.getElementById('set-show-claude')) document.getElementById('set-show-claude').checked = settings.showClaude !== false;
    if (document.getElementById('set-show-deepseek')) document.getElementById('set-show-deepseek').checked = settings.showDeepSeek !== false;
    if (document.getElementById('set-show-leonardo')) document.getElementById('set-show-leonardo').checked = settings.showLeonardo !== false;

    if (settings.useApiMode) {
        showToast("🌟 Aura AI Pro Mode Active!\nFuture API calls will be routed via OpenRouter.");
    } else {
        // [EN] Force hide if disabled
        // [TH] บังคับปิดถ้าปิดโหมดไปแล้ว
        toggleView('api', false);
    }

    const chkAutoSend = document.getElementById('set-auto-send');
    if (chkAutoSend) chkAutoSend.checked = settings.autoSend;
    const chkShortcutAutoSend = document.getElementById('set-shortcut-auto-send');
    if (chkShortcutAutoSend) chkShortcutAutoSend.checked = settings.autoSend;

    // Main UI Auto-Send Sync
    const chkAutoMain = document.getElementById('chk-auto-send-main');
    if (chkAutoMain) chkAutoMain.checked = settings.autoSend === true;

    // New Professional Settings Sync
    if (document.getElementById('set-auto-open-sidebar')) document.getElementById('set-auto-open-sidebar').checked = settings.autoOpenSidebar !== false;
    if (document.getElementById('set-auto-hide-sidebar')) document.getElementById('set-auto-hide-sidebar').checked = settings.autoHideSidebar === true;
    if (document.getElementById('set-add-ai-icon-top')) document.getElementById('set-add-ai-icon-top').checked = settings.addAiIconTop !== false;
    if (document.getElementById('set-auto-input-only')) document.getElementById('set-auto-input-only').checked = settings.autoInputOnly === true;

    if (document.getElementById('set-label-topic')) document.getElementById('set-label-topic').value = settings.labelTopic || '[YOUR TOPIC]';
    if (document.getElementById('set-label-product')) document.getElementById('set-label-product').value = settings.labelProduct || '[YOUR PRODUCT]';
    if (document.getElementById('set-label-text')) document.getElementById('set-label-text').value = settings.labelText || '[YOUR TEXT]';

    if (settings.excludeAIs) {
        if (document.getElementById('ex-chatgpt')) document.getElementById('ex-chatgpt').checked = settings.excludeAIs.chatgpt === true;
        if (document.getElementById('ex-gemini')) document.getElementById('ex-gemini').checked = settings.excludeAIs.gemini === true;
        if (document.getElementById('ex-claude')) document.getElementById('ex-claude').checked = settings.excludeAIs.claude === true;
        if (document.getElementById('ex-leonardo')) document.getElementById('ex-leonardo').checked = settings.excludeAIs.leonardo === true;
    }

    // Apply UI visibility based on settings
    const topAiSelector = document.getElementById('hub-ai-selector');
    if (topAiSelector) topAiSelector.style.display = settings.addAiIconTop ? 'block' : 'none';

    // Notion & Lookupper Sync
    if (document.getElementById('set-notion-api-key')) document.getElementById('set-notion-api-key').value = settings.notionApiKey || '';
    if (document.getElementById('set-notion-db-id')) document.getElementById('set-notion-db-id').value = settings.notionDatabaseId || '';
    if (document.getElementById('set-shortcut-lookupper')) document.getElementById('set-shortcut-lookupper').value = settings.lookupperShortcut || 'Alt+Q';
    if (document.getElementById('set-lookupper-privacy')) document.getElementById('set-lookupper-privacy').checked = settings.lookupperPrivacy !== false;
    if (document.getElementById('set-lookupper-autospeak')) document.getElementById('set-lookupper-autospeak').checked = settings.lookupperAutoSpeak === true;
    
    // Aura AI 3.0 Modular Gating
    refreshModularUI();
}

let isSyncing = false;

async function syncWithCloud() {
    if (isSyncing) return;
    isSyncing = true;
    try {
        if (!window.USER_DOC_REF) return;
        const docSnap = await getDoc(window.USER_DOC_REF);
        if (docSnap.exists()) {
            const cloudSettings = docSnap.data().settings;
            if (cloudSettings) {
                settings = { ...settings, ...cloudSettings };
                localStorage.setItem('aura_settings', JSON.stringify(settings));
                applySettingsToUI();
                switchMode(settings.currentMode || 'general');
                showToast("☁️ Settings Auto-Synced from Cloud!");
            }
        } else {
            // First time cloud user, push local settings to cloud
            await setDoc(window.USER_DOC_REF, { settings: settings }, { merge: true });
        }
    } catch (err) {
        console.error("Cloud Error:", err);
    }
    isSyncing = false;
}

// [MOVED TO PLATFORM CORE]

async function saveToCloud() {
    if (!window.USER_DOC_REF) return;
    try {
        await setDoc(window.USER_DOC_REF, { settings: settings }, { merge: true });
        console.log("Settings successfully backed up to cloud!");
    } catch (err) {
        console.error("Error backing up to cloud:", err);
    }
}

function loadSettings() {
    const saved = localStorage.getItem('aura_settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        settings = { ...settings, ...parsed };
        if (!settings.layouts) settings.layouts = { general: ['gemini', 'chatgpt'], ecommerce: ['gemini', 'leonardo'], japanese: ['gemini', 'claude'] };
        if (!settings.layouts.general) settings.layouts.general = ['gemini', 'chatgpt'];

        // Ensure new panels are in panelOrder
        if (!settings.panelOrder || !Array.isArray(settings.panelOrder)) {
            settings.panelOrder = ['gemini', 'chatgpt', 'claude', 'deepseek', 'leonardo', 'api', 'custom'];
        }
        if (!settings.panelOrder.includes('api')) settings.panelOrder.push('api');

        // Handle missing visibility flags for legacy users
        if (settings.showGemini === undefined) settings.showGemini = true;
        if (settings.showChatGPT === undefined) settings.showChatGPT = true;
        if (settings.showClaude === undefined) settings.showClaude = true;
        if (settings.showDeepSeek === undefined) settings.showDeepSeek = true;
        if (settings.showDeepSeek === undefined) settings.showDeepSeek = true;
        if (settings.showLeonardo === undefined) settings.showLeonardo = true;
        if (settings.showBing === undefined) settings.showBing = true;
        if (settings.showPerplexity === undefined) settings.showPerplexity = true;
        if (settings.showGrok === undefined) settings.showGrok = true;
        if (settings.showDuck === undefined) settings.showDuck = true;

        // Ensure new AIs are in panelOrder
        const newAIs = ['bing', 'perplexity', 'grok', 'duck'];
        newAIs.forEach(ai => {
            if (!settings.panelOrder.includes(ai)) settings.panelOrder.push(ai);
        });

        if (settings.showGraphicDesign === undefined) settings.showGraphicDesign = false;
        if (!settings.customTabs) settings.customTabs = [];

        if (!settings.currentMode) settings.currentMode = 'general';
        if (!settings.customPrompts || !Array.isArray(settings.customPrompts)) {
            settings.customPrompts = JSON.parse(JSON.stringify(defaultCustomPrompts));
        }
        
        // Ensure new Professional Settings for legacy users
        if (settings.autoOpenSidebar === undefined) settings.autoOpenSidebar = true;
        if (settings.autoHideSidebar === undefined) settings.autoHideSidebar = false;
        if (settings.addAiIconTop === undefined) settings.addAiIconTop = true;
        if (settings.autoInputOnly === undefined) settings.autoInputOnly = false;
        if (settings.labelTopic === undefined) settings.labelTopic = '[YOUR TOPIC]';
        if (settings.labelProduct === undefined) settings.labelProduct = '[YOUR PRODUCT]';
        if (settings.labelText === undefined) settings.labelText = '[YOUR TEXT]';
        if (settings.excludeAIs === undefined) settings.excludeAIs = { chatgpt: false, gemini: false, claude: false, leonardo: false };
        if (settings.notionApiKey === undefined) settings.notionApiKey = '';
        if (settings.notionDatabaseId === undefined) settings.notionDatabaseId = '';
        if (settings.lookupperShortcut === undefined) settings.lookupperShortcut = 'Alt+Q';
        if (settings.lookupperPrivacy === undefined) settings.lookupperPrivacy = true;
        if (settings.lookupperAutoSpeak === undefined) settings.lookupperAutoSpeak = false;
        if (settings.lookupperEnabled === undefined) settings.lookupperEnabled = true;
        if (settings.lookupperMemory === undefined) settings.lookupperMemory = {};

        // Migrate to Modular Add-ons (Aura AI 3.0)
        if (!settings.addons) {
            settings.addons = {
                translateOverlay: { installed: true, enabled: settings.lookupperEnabled !== false },
                ocrEngine: { installed: true, enabled: true },
                localAI: { installed: settings.useApiMode === true, enabled: settings.useApiMode === true },
                aiHub: { installed: true, enabled: true }
            };
            settings.firstLaunch = false; // Legacy users don't need onboarding
        }

        // Migration and Ensure full shortcut structure
        if (!settings.shortcuts || typeof settings.shortcuts.enabled === 'undefined') {
            const isMac = window.electronAPI && window.electronAPI.isMac;
            const old = settings.shortcuts || {};
            settings.shortcuts = isMac ? {
                enabled: true,
                send: { enabled: true, key: old.send || 'Cmd+H' },
                broadcast: { enabled: true, key: old.broadcast || 'Cmd+Shift+H' },
                sidebar: { enabled: true, key: old.sidebar || 'Cmd+G' },
                global: { enabled: true, key: old.global || 'Cmd+F' },
                p1: { enabled: true, key: 'Alt+1' },
                p2: { enabled: true, key: 'Alt+2' },
                p3: { enabled: true, key: 'Alt+3' },
                p4: { enabled: true, key: 'Alt+4' },
                p5: { enabled: true, key: 'Alt+5' }
            } : {
                enabled: true,
                send: { enabled: true, key: old.send || 'Ctrl+H' },
                broadcast: { enabled: true, key: old.broadcast || 'Ctrl+Shift+H' },
                sidebar: { enabled: true, key: old.sidebar || 'Ctrl+G' },
                global: { enabled: true, key: old.global || 'Alt+Space' },
                p1: { enabled: true, key: 'Alt+1' },
                p2: { enabled: true, key: 'Alt+2' },
                p3: { enabled: true, key: 'Alt+3' },
                p4: { enabled: true, key: 'Alt+4' },
                p5: { enabled: true, key: 'Alt+5' }
            };
        } else if (window.electronAPI && window.electronAPI.isMac) {
            // [EN] Proactive migration for existing Mac users using old Windows defaults
            // [TH] ย้ายคีย์ลัดสำหรับผู้ใช้ Mac เดิมที่ยังเป็นค่าเริ่มต้นของ Windows
            if (settings.shortcuts.global.key === 'Alt+Space') {
                settings.shortcuts.global.key = 'Cmd+F';
            }
            if (settings.shortcuts.send.key === 'Ctrl+H') settings.shortcuts.send.key = 'Cmd+H';
            if (settings.shortcuts.broadcast.key === 'Ctrl+Shift+H') settings.shortcuts.broadcast.key = 'Cmd+Shift+H';
            if (settings.shortcuts.sidebar.key === 'Ctrl+G') settings.shortcuts.sidebar.key = 'Cmd+G';
        }
    } else {
        settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
        settings.shortcuts = {
            enabled: true,
            send: { enabled: true, key: 'Ctrl+H' },
            broadcast: { enabled: true, key: 'Ctrl+Shift+H' },
            sidebar: { enabled: true, key: 'Ctrl+G' },
            global: { enabled: true, key: 'Alt+Space' },
            p1: { enabled: true, key: 'Alt+1' },
            p2: { enabled: true, key: 'Alt+2' },
            p3: { enabled: true, key: 'Alt+3' },
            p4: { enabled: true, key: 'Alt+4' },
            p5: { enabled: true, key: 'Alt+5' }
        };
    }

    // Enable/disable the API option in the hub dropdown based on Pro Mode
    const apiOption = document.querySelector('#hub-ai-selector option[value="api"]');
    if (apiOption) {
        apiOption.style.display = settings.useApiMode ? 'block' : 'none';
        if (!settings.useApiMode && settings.provider === 'api') {
            settings.provider = 'gemini'; // Revert to safe default if mode is disabled
        }
    }

    applySettingsToUI();
    refreshModularUI();

    // Initiate background sync with Firestore
    syncWithCloud();

    // Sync shortcuts to Main Process on startup
    if (settings.shortcuts) {
        window.electronAPI.send('toMain', { 
            type: 'update-shortcuts', 
            shortcuts: {
                ...settings.shortcuts,
                lookupper: { enabled: settings.lookupperEnabled !== false, key: settings.lookupperShortcut || 'Alt+Q' }
            } 
        });
    }

    // [EN] Sidebar Auto-Open Logic
    // [TH] ตรรกะการเปิด Sidebar อัตโนมัติ
    if (settings.autoOpenSidebar) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('hidden');
    }

    // [EN] Version Display
    // [TH] แสดงเวอร์ชัน
    const versionText = document.getElementById('current-version-display');
    if (versionText) versionText.innerText = 'v2.1.0'; // Updated Professional Version

    // [EN] Local AI Health Check & Pro Onboarding
    // [TH] ตรวจสอบสถานะ AI และเริ่มระบบแนะนำ (Onboarding)
    setTimeout(initAuraHome, 3000);
}

// --- AURA HOME: PLATFORM ONBOARDING (Aura AI 3.0) --- //
async function initAuraHome() {
    // Check if first launch
    const firstLaunch = settings.firstLaunch !== false;
    
    if (firstLaunch) {
        showAuraHomeModal();
    } else {
        // Just check local AI health in background if already onboarded
        checkLocalAIConnection().then(hasLocal => {
            if (hasLocal) refreshLocalAIStatus();
        });
    }
}

function showAuraHomeModal() {
    const modal = document.getElementById('modal-aura-home');
    if (modal) modal.classList.remove('hidden');

    const btnRecommended = document.getElementById('btn-onboarding-recommended');
    const btnCustomize = document.getElementById('btn-onboarding-customize');

    if (btnRecommended) {
        btnRecommended.onclick = () => {
            // Apply Recommended Setup
            updateAddonState('translateOverlay', { installed: true, enabled: true });
            updateAddonState('aiHub', { installed: true, enabled: true });
            
            settings.firstLaunch = false;
            saveSettings();
            
            modal.classList.add('hidden');
            showToast("✨ Aura AI 3.0: Powered by AI. Ready instantly.");
            
            // First Success Moment: Suggest trial
            setTimeout(() => {
                showToast("🚀 Try this: Press Alt+Q anywhere to translate.");
            }, 2000);
        };
    }

    if (btnCustomize) {
        btnCustomize.onclick = () => {
            settings.firstLaunch = false;
            saveSettings();
            modal.classList.add('hidden');
            
            // Open Add-on Manager (Store)
            if (typeof openStore === 'function') openStore();
            else if (storeOverlay) storeOverlay.classList.remove('hidden');
        };
    }
}

// Keep the technical setup modal for later use in the Store
async function initProOnboarding() {
    // Legacy support or fallback
}

async function checkLocalAIConnection() {
    const endpoint = (settings.openRouterKey || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res && res.ok;
    } catch (e) {
        return false;
    }
}

function showLocalAISetupModal() {
    const modal = document.getElementById('modal-local-ai-setup');
    if (modal) modal.classList.remove('hidden');

    const btnInstall = document.getElementById('btn-install-local-ai');
    const btnSkip = document.getElementById('btn-skip-local-ai');

    if (btnInstall) {
        btnInstall.onclick = () => {
            document.getElementById('onboarding-initial-actions').classList.add('hidden');
            document.getElementById('setup-progress-container').classList.remove('hidden');
            
            // Trigger Install via IPC
            window.electronAPI.send('toMain', { type: 'ollama-install' });
        };
    }

    // [EN] Manual Trigger from Settings
    // [TH] ปุ่มติดตั้ง AI จากหน้าการตั้งค่า
    const btnSettingsInstall = document.getElementById('btn-settings-install-ai');
    if (btnSettingsInstall) {
        btnSettingsInstall.onclick = () => {
            // Close settings to show onboarding or just use onboarding modal? 
            // Let's just show the onboarding modal as it's already built for progress
            showLocalAISetupModal();
        };
    }

    const btnSettingsCheck = document.getElementById('btn-settings-check-local');
    if (btnSettingsCheck) {
        btnSettingsCheck.onclick = async () => {
            btnSettingsCheck.innerText = "⏳ Checking...";
            await updateLocalAIStatus();
            btnSettingsCheck.innerText = "🔍 Check Status";
            showToast("✅ Local AI Check Complete.");
        };
    }

    const btnEditEndpoint = document.getElementById('btn-edit-endpoint');
    if (btnEditEndpoint) {
        btnEditEndpoint.onclick = () => {
            const endpointInput = document.getElementById('set-openrouter-key');
            if (endpointInput) {
                const isReadOnly = endpointInput.hasAttribute('readonly');
                if (isReadOnly) {
                    endpointInput.removeAttribute('readonly');
                    endpointInput.style.background = "rgba(255,255,255,0.05)";
                    endpointInput.style.cursor = "text";
                    endpointInput.style.opacity = "1";
                    btnEditEndpoint.innerText = "🔓";
                    showToast("⚠️ Advanced Mode: Endpoint URL Unlocked.");
                } else {
                    endpointInput.setAttribute('readonly', true);
                    endpointInput.style.background = "rgba(0,0,0,0.2)";
                    endpointInput.style.cursor = "not-allowed";
                    endpointInput.style.opacity = "0.8";
                    btnEditEndpoint.innerText = "✏️";
                }
            }
        };
    }
}

// IPC Listeners for Installation Progress
window.electronAPI.receive('fromMain', (data) => {
    if (data.type === 'ollama-progress') {
        const bar = document.getElementById('setup-progress-bar');
        const text = document.getElementById('setup-progress-percent');
        if (bar) bar.style.width = `${data.percent}%`;
        if (text) text.innerText = `${data.percent}%`;
    } else if (data.type === 'ollama-success') {
        const progressContainer = document.getElementById('setup-progress-container');
        const successMsg = document.getElementById('onboarding-success-msg');
        if (progressContainer) progressContainer.classList.add('hidden');
        if (successMsg) successMsg.classList.remove('hidden');
        localStorage.setItem('aura_onboarding_done', 'true');
        updateLocalAIStatus(); // Refresh model list
    } else if (data.type === 'ollama-error') {
        showToast("❌ Error installing AI: " + data.message);
        const initialActions = document.getElementById('onboarding-initial-actions');
        const progressContainer = document.getElementById('setup-progress-container');
        if (initialActions) initialActions.classList.remove('hidden');
        if (progressContainer) progressContainer.classList.add('hidden');
    }
});

// --- LOCAL AI DYNAMIC DISCOVERY --- //
async function updateLocalAIStatus() {
    const endpoint = (settings.openRouterKey || "http://127.0.0.1:11434").trim();
    const statusDots = document.querySelectorAll('#panel-api .status-dot');
    const modelSelector = document.getElementById('api-model-selector');
    
    let baseUrl = endpoint.replace(/\/v1\/chat\/completions\/?$/, '').replace(/\/$/, '');
    if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;

    try {
        // Try fetching tags (Ollama style) or models (OpenAI style)
        let response = await fetch(`${baseUrl}/api/tags`).catch(() => null);
        let isOllama = true;
        
        if (!response || !response.ok) {
            response = await fetch(`${baseUrl}/v1/models`).catch(() => null);
            isOllama = false;
        }

        if (response && response.ok) {
            const data = await response.json();
            statusDots.forEach(dot => {
                dot.style.background = '#10b981';
                dot.title = "Local AI Server Connected";
            });

            // Populate models if selector exists
            if (modelSelector) {
                const currentVal = modelSelector.value;
                modelSelector.innerHTML = '';
                
                const optGroup = document.createElement('optgroup');
                optGroup.label = isOllama ? "🦙 Ollama Models Found" : "🛸 Local Models Found";
                
                let models = [];
                if (isOllama && data.models) models = data.models.map(m => m.name);
                else if (data.data) models = data.data.map(m => m.id);

                if (models.length > 0) {
                    models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.innerText = m;
                        optGroup.appendChild(opt);
                    });
                    modelSelector.appendChild(optGroup);
                    
                    // Restore previous value if it still exists
                    if (models.includes(currentVal)) modelSelector.value = currentVal;
                    else modelSelector.selectedIndex = 0;
                } else {
                    const opt = document.createElement('option');
                    opt.innerText = "No models found. Please download one!";
                    modelSelector.appendChild(opt);
                }
            }
            console.log("[Aura AI] Local AI Status: Connected ✅");
        } else {
            throw new Error("Offline");
        }
    } catch (err) {
        statusDots.forEach(dot => {
            dot.style.background = '#ef4444';
            dot.title = "Local AI Server Disconnected. Is it running?";
        });
        console.warn("[Aura AI] Local AI Status: Disconnected ❌");
    }
}
// Manually refresh models every 30 seconds if panel is visible
setInterval(() => {
    const apiPanel = document.getElementById('panel-api');
    if (apiPanel && !apiPanel.classList.contains('hidden')) {
        updateLocalAIStatus();
    }
}, 30000);

function saveSettings() {
    try {
        // settings.provider is now controlled only by the top-bar selector, no need for redundant radio buttons
        const chkUsePrefix = document.getElementById('set-use-prefix');
        if (chkUsePrefix) settings.usePrefix = chkUsePrefix.checked;

        const txtPrefixVal = document.getElementById('set-prefix-val');
        if (txtPrefixVal) settings.prefix = txtPrefixVal.value;

        const chkUseSuffix = document.getElementById('set-use-suffix');
        if (chkUseSuffix) settings.useSuffix = chkUseSuffix.checked;

        const txtSuffixVal = document.getElementById('set-suffix-val');
        if (txtSuffixVal) settings.suffix = txtSuffixVal.value;

        const chkAutoSend = document.getElementById('set-auto-send');
        const chkShortcutAutoSend = document.getElementById('set-shortcut-auto-send');
        if (chkShortcutAutoSend) settings.autoSend = chkShortcutAutoSend.checked;
        else if (chkAutoSend) settings.autoSend = chkAutoSend.checked;

        let chkAutoRead = document.getElementById('set-auto-read');
        if (chkAutoRead) settings.autoRead = chkAutoRead.checked;

        let chkEcom = document.getElementById('set-show-ecommerce');
        if (chkEcom) settings.showEcommerce = chkEcom.checked;

        let chkJpn = document.getElementById('set-show-japanese');
        if (chkJpn) settings.showJapanese = chkJpn.checked;

        let chkGraphicDesign = document.getElementById('set-show-graphic-design');
        if (chkGraphicDesign) settings.showGraphicDesign = chkGraphicDesign.checked;

        let chkCustom = document.getElementById('set-show-custom');
        if (chkCustom) settings.showCustomAI = chkCustom.checked;

        let txtCustomName = document.getElementById('set-custom-name');
        if (txtCustomName) settings.customAIName = txtCustomName.value.trim() || 'Custom AI';

        let txtCustomUrl = document.getElementById('set-custom-url');
        if (txtCustomUrl) settings.customAIUrl = txtCustomUrl.value.trim();

        let txtAlias = document.getElementById('set-alias');
        if (txtAlias) settings.communityAlias = txtAlias.value.trim();

        let chkApiMode = document.getElementById('set-use-api-mode');
        let chkApiModeAddon = document.getElementById('set-use-api-mode-addon');
        if (chkApiModeAddon) settings.useApiMode = chkApiModeAddon.checked;
        else if (chkApiMode) settings.useApiMode = chkApiMode.checked;

        const txtApiKey = document.getElementById('set-openrouter-key');

        // Custom Shortcuts
        const chkShortcutsEnabled = document.getElementById('set-shortcuts-enabled');
        if (chkShortcutsEnabled) settings.shortcuts.enabled = chkShortcutsEnabled.checked;

        // Helper to collect individual shortcut
        const collectShortcut = (id, key) => {
            const chk = document.getElementById(`chk-shortcut-${id}`);
            const input = document.getElementById(`set-shortcut-${id}`);
            if (chk) settings.shortcuts[key].enabled = chk.checked;
            if (input) settings.shortcuts[key].key = input.value.trim() || settings.shortcuts[key].key;
        };

        collectShortcut('send', 'send');
        collectShortcut('broadcast', 'broadcast');
        collectShortcut('sidebar', 'sidebar');
        collectShortcut('global', 'global');
        collectShortcut('p1', 'p1');
        collectShortcut('p2', 'p2');
        collectShortcut('p3', 'p3');
        collectShortcut('p4', 'p4');
        collectShortcut('p5', 'p5');

        // Notify Main Process about shortcut changes
        window.electronAPI.send('toMain', { 
            type: 'update-shortcuts', 
            shortcuts: {
                ...settings.shortcuts,
                lookupper: { enabled: settings.lookupperEnabled !== false, key: settings.lookupperShortcut || 'Alt+Q' }
            } 
        });

        // AI Visibility (Always Tab)
        const providers = ['gemini', 'chatgpt', 'claude', 'deepseek', 'leonardo', 'bing', 'perplexity', 'grok', 'duck'];
        providers.forEach(p => {
            const chk = document.getElementById(`set-show-${p}`);
            if (chk) settings[`show${p.charAt(0).toUpperCase() + p.slice(1)}`] = chk.checked;
        });

        // Prompt Templates (Prompts Tab)
        let newPrompts = [];
        for (let i = 1; i <= 8; i++) {
            const lbl = document.getElementById(`p-label-${i}`);
            const cnt = document.getElementById(`p-content-${i}`);
            if (lbl && cnt && lbl.value.trim()) {
                newPrompts.push({ name: lbl.value.trim(), text: cnt.value.trim() });
            }
        }
        if (newPrompts.length > 0) settings.customPrompts = newPrompts;

        // New Professional Settings Save
        settings.autoOpenSidebar = document.getElementById('set-auto-open-sidebar')?.checked ?? settings.autoOpenSidebar;
        settings.autoHideSidebar = document.getElementById('set-auto-hide-sidebar')?.checked ?? settings.autoHideSidebar;
        settings.addAiIconTop = document.getElementById('set-add-ai-icon-top')?.checked ?? settings.addAiIconTop;
        settings.autoInputOnly = document.getElementById('set-auto-input-only')?.checked ?? settings.autoInputOnly;

        settings.labelTopic = document.getElementById('set-label-topic')?.value.trim() || settings.labelTopic;
        settings.labelProduct = document.getElementById('set-label-product')?.value.trim() || settings.labelProduct;
        settings.labelText = document.getElementById('set-label-text')?.value.trim() || settings.labelText;

        if (settings.excludeAIs) {
            settings.excludeAIs.chatgpt = document.getElementById('ex-chatgpt')?.checked ?? settings.excludeAIs.chatgpt;
            settings.excludeAIs.gemini = document.getElementById('ex-gemini')?.checked ?? settings.excludeAIs.gemini;
            settings.excludeAIs.claude = document.getElementById('ex-claude')?.checked ?? settings.excludeAIs.claude;
            settings.excludeAIs.leonardo = document.getElementById('ex-leonardo')?.checked ?? settings.excludeAIs.leonardo;
        }

        if (txtApiKey) settings.openRouterKey = txtApiKey.value.trim();

        // Notion & Lookupper Save
        settings.notionApiKey = document.getElementById('set-notion-api-key')?.value.trim() || settings.notionApiKey;
        settings.notionDatabaseId = document.getElementById('set-notion-db-id')?.value.trim() || settings.notionDatabaseId;
        settings.lookupperShortcut = document.getElementById('set-shortcut-lookupper')?.value.trim() || settings.lookupperShortcut;
        settings.lookupperPrivacy = document.getElementById('set-lookupper-privacy')?.checked !== false;
        settings.lookupperAutoSpeak = document.getElementById('set-lookupper-autospeak')?.checked === true;

        localStorage.setItem('aura_settings', JSON.stringify(settings));
        applySettingsToUI();
        switchMode(settings.currentMode || 'general');
        applyProviderChange(settings.provider);

        // Backup to cloud
        saveToCloud();

        showToast("⚙️ Settings Saved Successfully!");
        document.getElementById('settings-overlay').classList.add('hidden');
    } catch (e) {
        showToast("❌ Save Error: " + e.message);
        console.error(e);
    }
}

// Global Main UI Listeners
const chkAutoSendMain = document.getElementById('chk-auto-send-main');
if (chkAutoSendMain) {
    chkAutoSendMain.onchange = (e) => {
        settings.autoSend = e.target.checked;
        localStorage.setItem('aura_settings', JSON.stringify(settings));
        applySettingsToUI(); // Sync other instances of the checkbox
        showToast(settings.autoSend ? "⚡ Auto-Send Enabled" : "⚡ Auto-Send Disabled");
    };
}

function applyProviderChange(provider) {
    let hubSelect = document.getElementById('hub-ai-selector');
    if (hubSelect) hubSelect.value = provider;
    // ensure the target provider's panel is visible
    toggleView(provider, true);
    console.log(`Switched Target Provider to: ${provider}`);
}

function matchesShortcut(e, shortcutObj) {
    if (!settings.shortcuts || !settings.shortcuts.enabled || !shortcutObj || !shortcutObj.enabled) return false;
    const shortcutStr = normalizeShortcut(shortcutObj.key);
    if (!shortcutStr) return false;
    
    const parts = shortcutStr.toLowerCase().split('+');
    const isMac = window.electronAPI && window.electronAPI.isMac;
    
    // [EN] Primary Modifier (Cmd on Mac, Ctrl on Win)
    // [JP] プライマリ修飾キー (MacはCmd、WinはCtrl)
    // [TH] ปุ่มหลัก (Cmd บน Mac, Ctrl บน Windows)
    const isCmdOrCtrl = parts.includes('cmd') || parts.includes('ctrl');
    let primaryMatch = false;
    if (isCmdOrCtrl) {
        primaryMatch = isMac ? e.metaKey : e.ctrlKey;
    } else {
        primaryMatch = !e.metaKey && !e.ctrlKey;
    }

    let shiftMatch = parts.includes('shift') ? e.shiftKey : !e.shiftKey;
    let altMatch = parts.includes('alt') ? e.altKey : !e.altKey;

    let key = e.key;
    if (key === 'Unidentified' || !key) {
        if (e.code.startsWith('Digit')) key = e.code.replace('Digit', '');
        else if (e.code.startsWith('Numpad') && e.code.length === 7) key = e.code.replace('Numpad', '');
        else if (e.code) key = e.code;
    }

    const keyMatch = (key || '').toLowerCase() === parts[parts.length - 1];
    
    return primaryMatch && shiftMatch && altMatch && keyMatch;
}

// --- Event Listeners & Managers ---


// HUD Interaction Logic
if (btnSendRaw) btnSendRaw.onclick = () => injectToAI(hubInput.value);

// Local Hotkey Listeners (Fallback for Lookupper)
window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'l')) {
        console.log(`Renderer: Local Alt+${e.key.toUpperCase()} triggered!`);
        window.electronAPI.send('toMain', { type: 'lookupper-capture' });
    }
});

if (document.getElementById('btn-broadcast')) {
    document.getElementById('btn-broadcast').onclick = () => broadcastPrompt(hubInput.value);
}

function broadcastPrompt(text) {
    const val = text.trim();
    if (!val) return;

    Object.keys(panels).forEach(id => {
        const panel = panels[id];
        if (panel && !panel.classList.contains('hidden')) {
            injectToSpecificAI(id, val);
        }
    });

    hubInput.value = '';
    showToast("📢 Broadcasted message to all visible AIs!");
}

async function injectToSpecificAI(idOrWv, text) {
    if (idOrWv === 'api') {
        fetchOpenRouter(text);
        return;
    }

    let wv = (typeof idOrWv === 'string') ? webviews[idOrWv] : idOrWv;
    if (!wv) return;

    let finalPrompt = text;
    
    // Replace Global Subject placeholders
    const globalSubjectInput = document.getElementById('global-subject');
    if (globalSubjectInput && globalSubjectInput.value.trim()) {
        const subject = globalSubjectInput.value.trim();
        
        // Escape helper for RegExp
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const placeholders = [
            [/\[SUBJECT\]/gi, subject],
            [new RegExp(esc(settings.labelTopic || '[YOUR TOPIC]'), 'gi'), subject],
            [new RegExp(esc(settings.labelProduct || '[YOUR PRODUCT]'), 'gi'), subject],
            [new RegExp(esc(settings.labelText || '[YOUR TEXT]'), 'gi'), subject],
            [/\[PASTE SENTENCE\]/gi, subject],
            [/\[YOUR KANJI\]/gi, subject]
        ];
        
        placeholders.forEach(([regex, replacement]) => {
            finalPrompt = finalPrompt.replace(regex, replacement);
        });
    }

    if (settings.usePrefix) finalPrompt = settings.prefix.replace('{}', finalPrompt);
    if (settings.useSuffix) finalPrompt += settings.suffix;

    const script = `
        (function() {
            const selectors = ['div[contenteditable="true"]', '#prompt-textarea', 'textarea'];
            let inp;
            for (const s of selectors) {
                inp = document.querySelector(s);
                if (inp) break;
            }
            if (inp) {
                const txt = \`${finalPrompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\\$/g, '\\\\$')}\`;
                if (inp.tagName === 'DIV') inp.innerText = txt;
                else inp.value = txt;

                const evConf = { bubbles: true, cancelable: true };
                inp.dispatchEvent(new Event('input', evConf));
                inp.dispatchEvent(new Event('change', evConf));

                const autoSendActive = ${settings.autoSend} === true && ${settings.autoInputOnly} !== true;
                if (autoSendActive) {
                    setTimeout(() => {
                        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                        const sb = ['button[data-testid="send-button"]', 'button[aria-label*="Send"]', '.send-button', 'button:has(svg)'];
                        for (const s of sb) {
                            const b = document.querySelector(s);
                            if (b && !b.disabled) { b.click(); break; }
                        }
                    }, 400);
                }
            }
        })();
    `;
    wv.executeJavaScript(script);
}

// --- Injection & Target Management ---
function getTargetWebview() {
    // 1. Selector Manual Override
    if (hubAISelector && hubAISelector.value) {
        if (hubAISelector.value === 'all') return 'broadcast';
        return hubAISelector.value;
    }

    // 2. Fallback to settings provider if visible
    const current = settings.provider || 'gemini';
    const panel = panels[current];
    if (panel && !panel.classList.contains('hidden')) {
         return current;
    }

    // 3. Fallback: the first visible panel
    const visiblePanel = Object.values(panels).find(p => p && !p.classList.contains('hidden'));
    if (visiblePanel) {
        return visiblePanel.getAttribute('data-id');
    }
    return null;
}

async function injectToAI(text) {
    if (!text || !text.trim()) return;
    lastPrompt = text;
    
    // Support Global Subject
    let finalPrompt = text;
    if (globalSubject && globalSubject.value.trim()) {
        const subject = globalSubject.value.trim();
        finalPrompt = `Regarding [ ${subject} ]:\n\n${text}`;
    }

    const target = getTargetWebview();

    if (target === 'broadcast') {
        btnBroadcast.click();
    } else if (target === 'api') {
        fetchLocalAI(finalPrompt);
    } else if (target) {
        injectToSpecificAI(target, finalPrompt);
        showToast(`🚀 Prompt Sent to ${target.toUpperCase()}!`);
    } else {
        showToast("⚠️ No visible AI panel to receive prompt.");
    }
    if (hubInput) hubInput.value = ''; // Auto clear
}

// --- Settings & UI Management ---

// --- Tab Switching Logic (Pro Settings) ---
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(btn => {
    btn.onclick = () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');
    };
});

// --- Global Subject Sync ---
const globalSubjectInput = document.getElementById('global-subject');
const btnSyncSubject = document.getElementById('btn-sync-subject');

if (btnSyncSubject) {
    btnSyncSubject.onclick = () => {
        const subject = globalSubjectInput.value.trim();
        if (!subject) {
            showToast("⚠️ Please enter a subject first!");
            return;
        }
        showToast(`🎯 Subject synced: "${subject}"`);
        // Optional: Trigger a broadcast with a default "Subject" prompt
        // broadcastPrompt(`Tell me more about [SUBJECT]`);
    };
}

// Support Enter key in Global Subject to quickly sync
if (globalSubjectInput) {
    globalSubjectInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            btnSyncSubject.click();
            e.preventDefault();
        }
    };
}

// --- Quick Export to Clipboard (Creative Suite) ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-export-clipboard')) {
        const panel = e.target.closest('.view-panel');
        if (!panel) return;
        const id = panel.getAttribute('data-id');
        const wv = webviews[id];
        if (!wv) return;

        showToast(`📸 Exporting ${id.toUpperCase()} view...`);
        
        // Capture a screenshot of the webview and copy to clipboard
        wv.capturePage().then(img => {
            const dataUrl = img.toDataURL();
            // We can't directly write to clipboard with dataURL easily in Electron renderer without bridge,
            // but we can send it to main or use a trick.
            // For now, let's copy the LAST PROMPT text as a fallback or if it's text.
            window.electronAPI.send('toMain', { type: 'copy-image', dataUrl });
            showToast("✅ Image copied to clipboard! Ready for Photoshop/Canva.");
        }).catch(err => {
            console.error("Export Error:", err);
            showToast("❌ Export failed.");
        });
    }
});

// Hook into switchMode
const originalSwitchMode = window.switchMode; // If it's global
// Since it's likely not global, I'll find where it's defined and modify it.

// --- Shortcut Recorder Logic ---
// 録音機能 (Rokuon kinou) - ตัวบันทึกคีย์ลัด
function setupShortcutRecorders() {
    const recorderIds = [
        'set-shortcut-send', 'set-shortcut-broadcast', 'set-shortcut-sidebar', 
        'set-shortcut-global', 'set-shortcut-p1', 'set-shortcut-p2', 
        'set-shortcut-p3', 'set-shortcut-p4', 'set-shortcut-p5', 'set-shortcut-lookupper'
    ];

    recorderIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        input.onkeydown = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore bare modifier keys
            if (['Control', 'Alt', 'Shift', 'Meta', 'Command', 'OS'].includes(e.key)) return;

            const isMac = window.electronAPI && window.electronAPI.isMac;
            const parts = [];
            // [EN] Sort order: Ctrl, Cmd (Meta), Alt, Shift, Key
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.metaKey) parts.push('Cmd');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey) parts.push('Shift');

            let key = e.key;
            
            // [EN] Handle "Unidentified" keys specially (common for numerical or special keys on some layouts)
            // [TH] จัดการคีย์ "Unidentified" เป็นพิเศษ (มักเกิดกับตัวเลขหรือปุ่มพิเศษในบางเลย์เอาต์)
            if (key === 'Unidentified' || !key) {
                if (e.code.startsWith('Digit')) key = e.code.replace('Digit', '');
                else if (e.code.startsWith('Numpad') && e.code.length === 7) key = e.code.replace('Numpad', '');
                else if (e.code) key = e.code;
            }

            if (key === ' ') key = 'Space';
            else if (key && key.length === 1) key = key.toUpperCase();
            
            // Avoid duplicate text if key is a modifier (happens in some edge cases)
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

            if (key) parts.push(key);
            const shortcutStr = parts.join('+');
            input.value = getDisplayKey(shortcutStr, isMac);
        };

        // Clear on Right Click or Double Click? Let's just allow backspace?
        // Actually, since we preventDefault on keydown, backspace won't work normally.
        // Let's make it so Escape clears the field if focused.
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                input.value = '';
            }
        });
    });
}
// Initialize after DOM load
setTimeout(() => {
    setupShortcutRecorders();
    
    // Reset Button Logic
    const btnReset = document.getElementById('btn-reset-shortcuts');
    if (btnReset) {
        btnReset.onclick = () => {
            const isMac = window.electronAPI && window.electronAPI.isMac;
            const defaults = isMac ? {
                enabled: true,
                send: { enabled: true, key: 'Cmd+H' },
                broadcast: { enabled: true, key: 'Cmd+Shift+H' },
                sidebar: { enabled: true, key: 'Cmd+G' },
                global: { enabled: true, key: 'Cmd+F' },
                p1: { enabled: true, key: 'Alt+1' },
                p2: { enabled: true, key: 'Alt+2' },
                p3: { enabled: true, key: 'Alt+3' },
                p4: { enabled: true, key: 'Alt+4' },
                p5: { enabled: true, key: 'Alt+5' }
            } : {
                enabled: true,
                send: { enabled: true, key: 'Ctrl+H' },
                broadcast: { enabled: true, key: 'Ctrl+Shift+H' },
                sidebar: { enabled: true, key: 'Ctrl+G' },
                global: { enabled: true, key: 'Alt+Space' },
                p1: { enabled: true, key: 'Alt+1' },
                p2: { enabled: true, key: 'Alt+2' },
                p3: { enabled: true, key: 'Alt+3' },
                p4: { enabled: true, key: 'Alt+4' },
                p5: { enabled: true, key: 'Alt+5' }
            };
            
            settings.shortcuts = defaults;
            applySettingsToUI();
            showToast("🔄 Shortcuts Reset to Defaults!");
        };
    }

    // Reset Prompts Logic
    const btnResetPrompts = document.getElementById('btn-reset-prompts');
    if (btnResetPrompts) {
        btnResetPrompts.onclick = () => {
            if (confirm("Reset all 8 prompt templates to defaults?")) {
                settings.customPrompts = JSON.parse(JSON.stringify(defaultCustomPrompts));
                applySettingsToUI();
                showToast("🔄 Custom Prompts Reset to Defaults!");
            }
        };
    }
}, 1000);

const btnUpdateUser = document.getElementById('btn-update-username');
if (btnUpdateUser) {
    btnUpdateUser.onclick = async () => {
        const newUsername = document.getElementById('set-username').value.trim().toLowerCase();
        if (!newUsername) {
            showToast("⚠️ Please enter a username.");
            return;
        }
        if (newUsername === settings.username) return;

        try {
            const q = query(collection(db, "usernames"), where("username", "==", newUsername));
            const snap = await getDocs(q);
            if (!snap.empty) {
                showToast("❌ Username already taken.");
                return;
            }
            if (auth.currentUser && auth.currentUser.email) {
                await setDoc(doc(db, "usernames", newUsername), { email: auth.currentUser.email.toLowerCase() });
                settings.username = newUsername;
                localStorage.setItem('aura_settings', JSON.stringify(settings));
                saveToCloud();
                showToast("✅ Username updated successfully!");
            }
        } catch (e) {
            showToast("❌ Error updating username: " + e.message);
        }
    };
}

const btnLogoutConsolidated = document.getElementById('btn-logout');
if (btnLogoutConsolidated) {
    btnLogoutConsolidated.onclick = async () => {
        if (confirm("Are you sure you want to sign out?")) {
            try {
                await signOut(auth);
                showToast("👋 Signed out successfully!");
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error("Logout Error", error);
            }
        }
    };
}

// --- Custom Prompt Management ---
const promptOverlay = document.getElementById('prompt-overlay');
const btnAddPrompt = document.getElementById('btn-add-prompt');
const btnClosePrompt = document.getElementById('btn-close-prompt');
const btnSavePrompt = document.getElementById('btn-save-prompt');
const btnDeletePrompt = document.getElementById('btn-delete-prompt');
const inputPromptLabel = document.getElementById('prompt-label');
const inputPromptText = document.getElementById('prompt-text');
const promptModalTitle = document.getElementById('prompt-modal-title');
let currentEditingIndex = -1; // -1 means creating new

const btnSharePrompt = document.getElementById('btn-share-prompt');

function openPromptModal(index = -1, label = '', text = '') {
    currentEditingIndex = index;
    inputPromptLabel.value = label;
    inputPromptText.value = text;
    promptOverlay.classList.remove('hidden');

    if (index >= 0) {
        promptModalTitle.innerText = "✏️ Edit Prompt";
        btnDeletePrompt.style.display = 'block';
        if (btnSharePrompt) btnSharePrompt.style.display = 'block';
    } else {
        promptModalTitle.innerText = "✨ Add New Prompt";
        btnDeletePrompt.style.display = 'none';
        if (btnSharePrompt) btnSharePrompt.style.display = 'none';
    }
}

if (btnAddPrompt) btnAddPrompt.onclick = () => openPromptModal();
if (btnClosePrompt) btnClosePrompt.onclick = () => promptOverlay.classList.add('hidden');
if (btnSavePrompt) {
    btnSavePrompt.onclick = () => {
        const label = inputPromptLabel.value.trim();
        const text = inputPromptText.value.trim();
        if (!label || !text) {
            showToast("⚠️ Label and Content Text cannot be empty.");
            return;
        }

        if (!settings.customPrompts) settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
        const mode = settings.currentMode;
        if (!settings.customPrompts[mode]) settings.customPrompts[mode] = [];

        if (currentEditingIndex >= 0) {
            settings.customPrompts[mode][currentEditingIndex] = { label, text };
            showToast("✏️ Prompt Updated!");
        } else {
            settings.customPrompts[mode].push({ label, text });
            showToast("✨ New Prompt Saved!");
        }

        localStorage.setItem('aura_settings', JSON.stringify(settings));
        saveToCloud(); // Save prompt edit
        promptOverlay.classList.add('hidden');
        renderPrompts(mode);
    };
}
if (btnDeletePrompt) {
    btnDeletePrompt.onclick = () => {
        if (currentEditingIndex >= 0 && confirm("Are you sure you want to delete this prompt?")) {
            const mode = settings.currentMode;
            settings.customPrompts[mode].splice(currentEditingIndex, 1);
            localStorage.setItem('aura_settings', JSON.stringify(settings));
            saveToCloud(); // Save prompt deletion
            promptOverlay.classList.add('hidden');
            renderPrompts(mode);
            showToast("🗑️ Prompt Deleted!");
        }
    };
}

if (btnSharePrompt) {
    btnSharePrompt.onclick = async () => {
        if (!currentUser) {
            showToast("⚠️ Must be signed in to share prompts!");
            return;
        }

        const label = inputPromptLabel.value.trim();
        const text = inputPromptText.value.trim();

        btnSharePrompt.innerText = "⏳ Sharing...";
        try {
            await addDoc(collection(db, "community_prompts"), {
                label: label,
                text: text,
                mode: settings.currentMode,
                author: settings.communityAlias || settings.username || currentUser.email || "Anonymous",
                ownerId: currentUser.uid,
                timestamp: new Date().toISOString()
            });
            showToast("🌍 Prompt Shared to Community!");
            promptOverlay.classList.add('hidden');
        } catch (e) {
            console.error(e);
            showToast("⚠️ Failed to share prompt.");
        }
        btnSharePrompt.innerText = "🌍 Share to World";
    };
}

// --- Community Prompts Logic ---
const communityOverlay = document.getElementById('community-overlay');
const btnOpenCommunity = document.getElementById('btn-open-community');
const btnCloseCommunity = document.getElementById('btn-close-community');
const btnRefreshCommunity = document.getElementById('btn-refresh-community');
const communityList = document.getElementById('community-list');

async function renderCommunityPrompts() {
    const list = document.getElementById('community-list');
    const searchVal = document.getElementById('search-community-prompts').value.toLowerCase();

    list.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">Fetching from Cloud...</div>';
    try {
        const q = query(collection(db, "community_prompts"), orderBy("timestamp", "desc"), limit(50));
        const querySnapshot = await getDocs(q);

        list.innerHTML = '';
        let count = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const textMatch = data.text.toLowerCase().includes(searchVal);
            const labelMatch = data.label.toLowerCase().includes(searchVal);
            const authorMatch = (data.author || '').toLowerCase().includes(searchVal);

            if (searchVal && !textMatch && !labelMatch && !authorMatch) return;
            count++;

            const div = document.createElement('div');
            div.style.cssText = "background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start;";

            div.innerHTML = `
                <div style="flex-grow: 1; padding-right: 15px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                        <h4 style="margin: 0; color: var(--accent);">${data.label}</h4>
                        <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4); border: 1px solid var(--glass-border); padding: 2px 6px; border-radius: 10px;">${data.mode}</span>
                    </div>
                    <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: rgba(255,255,255,0.8); white-space: pre-wrap; word-break: break-word;">${data.text}</p>
                    <small style="color: rgba(255,255,255,0.5);">By: ${data.author || 'Anonymous'}</small>
                </div>
            `;

            const btnAdd = document.createElement('button');
            btnAdd.innerText = "➕ Add";
            btnAdd.style.cssText = "background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; flex-shrink: 0;";
            btnAdd.onclick = () => {
                if (!settings.customPrompts) settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
                if (!settings.customPrompts[data.mode]) settings.customPrompts[data.mode] = [];
                settings.customPrompts[data.mode].push({ label: data.label, text: data.text });

                localStorage.setItem('aura_settings', JSON.stringify(settings));
                saveToCloud(); // sync add
                renderPrompts(settings.currentMode);
                showToast(`✨ Added "${data.label}" to your ${data.mode} library!`);
            };

            div.appendChild(btnAdd);

            // Allow Owner to Unpublish (Check by ownerId or fallback to email)
            const isOwner = currentUser && (data.ownerId === currentUser.uid || data.author === (currentUser.email || currentUser.uid));
            if (isOwner) {
                const btnUnpublish = document.createElement('button');
                btnUnpublish.innerText = "🗑️ Unpublish";
                btnUnpublish.style.cssText = "background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.75rem; margin-top: 5px;";
                btnUnpublish.onclick = async () => {
                    if (confirm("Are you sure you want to stop sharing this prompt?")) {
                        try {
                            await deleteDoc(doc(db, "community_prompts", docSnap.id));
                            showToast("🗑️ Prompt unpublished from community.");
                            renderCommunityPrompts();
                        } catch (e) {
                            showToast("❌ Error: " + e.message);
                        }
                    }
                };
                div.querySelector('div').appendChild(btnUnpublish);
            }

            list.appendChild(div);
        });

        if (count === 0) {
            list.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">${searchVal ? 'No results found for your search.' : 'No prompts found.'}</div>`;
        }
    } catch (error) {
        console.error("Error loading community prompts", error);
        communityList.innerHTML = '<div style="text-align: center; color: #fca5a5; padding: 20px;">Failed to load prompts.</div>';
    }
}

if (btnOpenCommunity) {
    btnOpenCommunity.onclick = () => {
        communityOverlay.classList.remove('hidden');
        renderCommunityPrompts();
    };
}
if (btnCloseCommunity) btnCloseCommunity.onclick = () => communityOverlay.classList.add('hidden');
if (btnRefreshCommunity) btnRefreshCommunity.onclick = () => renderCommunityPrompts();

// --- Add-on Store Logic ---
function updateStoreButtons() {
    storeItems.forEach(btn => {
        const addon = btn.getAttribute('data-addon');
        const isInstalled = (addon === 'ecommerce' && settings.showEcommerce) ||
            (addon === 'japanese' && settings.showJapanese) ||
            (addon === 'graphic-design' && settings.showGraphicDesign);

        if (isInstalled) {
            btn.innerText = "Uninstall";
            btn.style.background = "rgba(239, 68, 68, 0.2)";
            btn.style.color = "#ef4444";
            btn.style.border = "1px solid rgba(239, 68, 68, 0.5)";
        } else {
            btn.innerText = "Install";
            btn.style.background = "var(--accent)";
            btn.style.color = "white";
            btn.style.border = "none";
        }
    });
}


// Expose window functions for UI hooks defined in HTML
window.showToast = showToast;

// Address Bar Logic
const addrBar = document.getElementById('custom-ai-address');
if (addrBar) {
    addrBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            let url = addrBar.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            const wvCustom = webviews['custom'];
            if (wvCustom) wvCustom.src = url;
            addrBar.blur();
        }
    });
}

// Sync Address Bar with Webview Navigation
const wvCustomForAddr = webviews['custom'];
if (wvCustomForAddr) {
    const updateAddr = () => {
        if (addrBar) addrBar.value = wvCustomForAddr.getURL();
    };
    wvCustomForAddr.addEventListener('did-navigate', updateAddr);
    wvCustomForAddr.addEventListener('did-navigate-in-page', updateAddr);
}

// [EN] Community Add-on Management (Removed to fix ReferenceError)
// [TH] จัดการ Community Add-on (ลบออกเพื่อแก้ปัญหา ReferenceError)

if (typeof btnPublishAddon !== 'undefined' && btnPublishAddon) btnPublishAddon.onclick = async () => {
    const name = document.getElementById('addon-name').value.trim();
    const emoji = document.getElementById('addon-emoji').value.trim();
    const desc = document.getElementById('addon-desc').value.trim();
    const isPublic = document.getElementById('chk-publish-public').checked;

    if (!name || !emoji) { showToast("⚠️ Name and Emoji are required!"); return; }

    btnPublishAddon.innerText = "⏳ Processing...";
    try {
        const layouts = settings.layouts[settings.currentMode] || [];
        const prompts = getActivePrompts(settings.currentMode);

        if (!settings.communityModes) settings.communityModes = [];

        if (editingAddonId) {
            // Update existing
            const index = settings.communityModes.findIndex(m => m.id === editingAddonId);
            if (index !== -1) {
                settings.communityModes[index].name = name;
                settings.communityModes[index].emoji = emoji;
                settings.communityModes[index].description = desc;
                settings.communityModes[index].isPublic = isPublic;
            }
            showToast(`✅ Workspace "${name}" updated!`);
        } else {
            // Create new
            const id = "custom_" + Date.now();
            settings.communityModes.push({
                id: id,
                name,
                emoji,
                description: desc,
                layouts: layouts,
                isPublic: isPublic
            });
            // Link prompts
            if (!settings.customPrompts) settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
            settings.customPrompts[id] = prompts;
            showToast(`✨ Workspace "${name}" created! Check your sidebar.`);
        }

        // Publish to community if checked and it's a new or changed to public
        if (isPublic && currentUser) {
            const addonData = {
                name,
                emoji,
                description: desc,
                author: settings.communityAlias || settings.username || currentUser.email || currentUser.uid,
                ownerId: currentUser.uid,
                timestamp: new Date().toISOString(),
                layouts: layouts,
                prompts: prompts
            };
            await addDoc(collection(db, "community_addons"), addonData);
            showToast(`🌍 Published to community store!`);
        }

        localStorage.setItem('aura_settings', JSON.stringify(settings));
        saveToCloud();
        renderSidebarCommunityModes();
        createAddonOverlay.classList.add('hidden');
    } catch (e) {
        showToast("❌ Error: " + e.message);
    }
    btnPublishAddon.innerText = "🌍 Create & Save";
};

async function renderCommunityAddons() {
    if (!communityAddonList) return;
    const searchVal = document.getElementById('search-community-addons').value.toLowerCase();

    communityAddonList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.3); padding: 20px;">Loading community add-ons...</div>';

    try {
        const q = query(collection(db, "community_addons"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        communityAddonList.innerHTML = '';
        let count = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const nameMatch = data.name.toLowerCase().includes(searchVal);
            const descMatch = (data.description || '').toLowerCase().includes(searchVal);

            if (searchVal && !nameMatch && !descMatch) return;
            count++;

            const div = document.createElement('div');
            div.className = "store-item";
            div.style.cssText = "background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";

            const isInstalled = settings.communityModes.some(m => m.id === docSnap.id);

            div.innerHTML = `
                <div style="flex-grow: 1; padding-right: 15px;">
                    <h3 style="margin: 0 0 5px 0;">${data.emoji} ${data.name}</h3>
                    <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.5);">${data.description}</p>
                    <small style="color: rgba(255,255,255,0.3);">By: ${data.author}</small>
                </div>
            `;

            const btnInstall = document.createElement('button');
            btnInstall.innerText = isInstalled ? "Installed" : "Install";
            btnInstall.disabled = isInstalled;
            btnInstall.className = "store-btn-install";
            btnInstall.style.cssText = isInstalled ?
                "background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); cursor: default;" :
                "background: var(--accent); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: 600;";

            btnInstall.onclick = () => {
                if (isInstalled) return;
                installCommunityAddon(docSnap.id, data);
            };

            // Owner Unpublish
            const isOwner = currentUser && (data.ownerId === currentUser.uid || data.author === (currentUser.email || currentUser.uid));
            if (isOwner) {
                const btnDel = document.createElement('button');
                btnDel.innerText = "🗑️";
                btnDel.style.cssText = "background: transparent; border: none; color: #ef4444; margin-right: 10px; cursor: pointer;";
                btnDel.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${data.name}" from community store?`)) {
                        await deleteDoc(doc(db, "community_addons", docSnap.id));
                        showToast(`🗑️ "${data.name}" uninstalled from community store.`);
                        renderCommunityAddons();
                    }
                };
                div.appendChild(btnDel);
            }

            div.appendChild(btnInstall);
            communityAddonList.appendChild(div);
        });

        if (count === 0) {
            communityAddonList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.3); padding: 20px;">No results found.</div>';
        }
    } catch (e) {
        console.error(e);
        communityAddonList.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Error loading add-ons.</div>';
    }
}

function installCommunityAddon(id, data) {
    if (!settings.communityModes) settings.communityModes = [];

    // Add to settings
    settings.communityModes.push({
        id: id,
        name: data.name,
        emoji: data.emoji,
        layouts: data.layouts
    });

    // Merge Prompts
    if (!settings.customPrompts) settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
    settings.customPrompts[id] = data.prompts;

    localStorage.setItem('aura_settings', JSON.stringify(settings));
    saveToCloud();
    renderSidebarCommunityModes();
    showToast(`✅ "${data.emoji} ${data.name}" installed successfully!`);
    renderCommunityAddons();
}

function renderSidebarCommunityModes() {
    const container = document.getElementById('community-modes-container');
    if (!container) return;
    container.innerHTML = '';

    if (!settings.communityModes) settings.communityModes = [];

    settings.communityModes.forEach(mode => {
        const btn = document.createElement('button');
        btn.id = `btn-mode-${mode.id}`;
        btn.className = settings.currentMode === mode.id ? 'active' : '';
        btn.innerHTML = `
            <span class="icon">${mode.emoji}</span>
            <span class="label">${mode.name}</span>
            <div class="addon-actions" style="margin-left: auto; display: flex; gap: 8px;">
                <span class="edit-addon" title="Edit Workspace" style="color: rgba(255,255,255,0.2); font-size: 0.7rem; display: none;">✎</span>
                <span class="delete-addon" title="Delete Workspace" style="color: rgba(255,255,255,0.2); font-size: 0.7rem; display: none;">✕</span>
            </div>
        `;

        btn.onclick = (e) => {
            if (e.target.classList.contains('delete-addon')) {
                if (confirm(`Remove "${mode.name}" from your workspace?`)) {
                    settings.communityModes = settings.communityModes.filter(m => m.id !== mode.id);
                    if (settings.customPrompts) delete settings.customPrompts[mode.id];

                    localStorage.setItem('aura_settings', JSON.stringify(settings));
                    saveToCloud();
                    renderSidebarCommunityModes();

                    if (settings.currentMode === mode.id) switchMode('general');

                    showToast(`🗑️ Removed "${mode.name}"`);
                }
                return;
            }
            if (e.target.classList.contains('edit-addon')) {
                openEditAddon(mode.id);
                return;
            }
            switchMode(mode.id);
        };

        btn.oncontextmenu = (e) => {
            e.preventDefault();
            openEditAddon(mode.id);
        };

        btn.onmouseover = () => {
            const del = btn.querySelector('.delete-addon');
            const edit = btn.querySelector('.edit-addon');
            if (del) del.style.display = 'block';
            if (edit) edit.style.display = 'block';
        };
        btn.onmouseout = () => {
            const del = btn.querySelector('.delete-addon');
            const edit = btn.querySelector('.edit-addon');
            if (del) del.style.display = 'none';
            if (edit) edit.style.display = 'none';
        }

        container.appendChild(btn);
    });
}

// --- Dynamic Webview / Unlimited Tabs Logic ---
const customTabOverlay = document.getElementById('create-custom-tab-overlay');
const btnAddCustomTab = document.getElementById('btn-add-custom-tab');
const btnCloseCustomTabModal = document.getElementById('btn-close-custom-tab-modal');
const btnSaveCustomTab = document.getElementById('btn-save-custom-tab');
const btnDeleteCustomTabConfirm = document.getElementById('btn-delete-custom-tab-confirm');

let editingTabId = null;

if (btnAddCustomTab) btnAddCustomTab.onclick = () => {
    editingTabId = null;
    document.getElementById('custom-tab-modal-title').innerText = "🌐 Add Custom Webview";
    document.getElementById('custom-tab-name').value = "";
    document.getElementById('custom-tab-url').value = "";
    document.getElementById('custom-tab-emoji').value = "🌐";
    if (btnDeleteCustomTabConfirm) btnDeleteCustomTabConfirm.style.display = 'none';
    const linkContainer = document.getElementById('custom-tab-links-container');
    if (linkContainer) linkContainer.style.display = 'none';
    customTabOverlay.classList.remove('hidden');
};

if (btnCloseCustomTabModal) btnCloseCustomTabModal.onclick = () => customTabOverlay.classList.add('hidden');

// Shortcut Manager UI Constants
const linkManagerOverlay = document.getElementById('link-manager-overlay');
const linkManagerList = document.getElementById('link-manager-list');
const btnCloseLinkManager = document.getElementById('btn-close-link-manager');
const btnSaveLinkManager = document.getElementById('btn-save-link-manager');
let currentManagingProvider = null;

if (btnCloseLinkManager) btnCloseLinkManager.onclick = () => linkManagerOverlay.classList.add('hidden');
if (btnSaveLinkManager) btnSaveLinkManager.onclick = () => linkManagerOverlay.classList.add('hidden');

const btnAddNewLink = document.getElementById('btn-add-new-link');
if (btnAddNewLink) {
    btnAddNewLink.onclick = () => {
        const newLink = { name: "New Link", url: "https://", icon: "📌" };
        if (currentManagingProvider === 'custom') {
            if (!settings.customAIQuickLinks) settings.customAIQuickLinks = [];
            settings.customAIQuickLinks.push(newLink);
        } else {
            const tab = settings.customTabs.find(t => t.id === currentManagingProvider);
            if (tab) {
                if (!tab.quickLinks) tab.quickLinks = [];
                tab.quickLinks.push(newLink);
            }
        }
        saveSettings();
        renderLinkManagerList();
        refreshPanelToolbar(currentManagingProvider);
        showToast("➕ New Shortcut Added!");
    };
}

// Open Editor for Inspiration (Custom AI) Header Button
const btnEditCustomTools = document.getElementById('btn-edit-custom-tools');
if (btnEditCustomTools) {
    btnEditCustomTools.onclick = () => openShortcutManager('custom');
}

function openShortcutManager(provider) {
    currentManagingProvider = provider;
    renderLinkManagerList();
    linkManagerOverlay.classList.remove('hidden');
}

function renderLinkManagerList() {
    if (!linkManagerList) return;
    linkManagerList.innerHTML = '';
    
    let links = [];
    if (currentManagingProvider === 'custom') {
        links = settings.customAIQuickLinks || [];
    } else {
        const tab = settings.customTabs.find(t => t.id === currentManagingProvider);
        links = tab ? (tab.quickLinks || []) : [];
    }

    if (links.length === 0) {
        linkManagerList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.3); font-size:0.8rem; padding:20px;">No shortcuts added yet.</p>';
        return;
    }

    links.forEach((link, idx) => {
        const item = document.createElement('div');
        item.className = 'link-item';
        item.draggable = true;
        item.style = "display: flex; flex-direction: column; gap: 5px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); position: relative; cursor: grab;";
        
        // Add drag handle icon
        item.innerHTML = `
            <div class="drag-handle" style="position: absolute; left: -15px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.2); cursor: grab; font-size: 0.8rem;">⠿</div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="text" class="link-icon-input" value="${link.icon || '📌'}" title="Icon/Emoji" style="width: 30px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; text-align: center; color: white; outline: none;">
                <input type="text" class="link-name-input" value="${link.name}" placeholder="Name" style="background: transparent; border: none; color: white; font-weight: bold; flex: 1; outline: none;">
                <button class="delete-btn" title="Remove" style="margin-left: auto;">✕</button>
            </div>
            <input type="text" class="link-url-input" value="${link.url}" placeholder="URL" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); font-size: 0.75rem; border-radius: 4px; padding: 2px 8px; width: 100%; outline: none;">
        `;
        
        const iconInput = item.querySelector('.link-icon-input');
        const nameInput = item.querySelector('.link-name-input');
        const urlInput = item.querySelector('.link-url-input');

        iconInput.onchange = (e) => {
            link.icon = e.target.value.trim() || '📌';
            saveSettings();
            refreshPanelToolbar(currentManagingProvider);
            showToast("✨ Icon Updated!");
        };

        nameInput.onchange = (e) => {
            link.name = e.target.value;
            saveSettings();
            refreshPanelToolbar(currentManagingProvider);
        };

        urlInput.onchange = (e) => {
            let val = e.target.value.trim();
            if (val && !val.startsWith('http')) val = 'https://' + val;
            link.url = val;
            saveSettings();
            refreshPanelToolbar(currentManagingProvider);
        };

        item.querySelector('.delete-btn').onclick = () => {
            if (confirm(`Delete shortcut "${link.name}"?`)) {
                links.splice(idx, 1);
                saveSettings();
                renderLinkManagerList();
                refreshPanelToolbar(currentManagingProvider);
            }
        };

        // --- Drag and Drop for Shortcuts ---
        item.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', idx);
            item.style.opacity = '0.4';
        };
        item.ondragend = () => item.style.opacity = '1';
        item.ondragover = (e) => e.preventDefault();
        item.ondrop = (e) => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = idx;
            if (fromIdx !== toIdx) {
                const movedItem = links.splice(fromIdx, 1)[0];
                links.splice(toIdx, 0, movedItem);
                saveSettings();
                renderLinkManagerList();
                refreshPanelToolbar(currentManagingProvider);
            }
        };

        linkManagerList.appendChild(item);
    });
}

function refreshPanelToolbar(provider) {
    const panel = panels[provider];
    if (panel) {
        removeGDToolbarFromPanel(panel);
        injectGDToolbarToPanel(panel);
    }
}

function openEditCustomTab(id) {
    const tab = settings.customTabs.find(t => t.id === id);
    if (!tab) return;
    editingTabId = id;
    document.getElementById('custom-tab-modal-title').innerText = "⚙️ Edit Webview";
    document.getElementById('custom-tab-name').value = tab.name;
    document.getElementById('custom-tab-url').value = tab.url;
    document.getElementById('custom-tab-emoji').value = tab.emoji || "🌐";
    
    // Show Shortcuts section in the edit modal too
    const linksContainer = document.getElementById('custom-tab-links-container');
    const linksList = document.getElementById('custom-tab-links-list');
    if (linksContainer && linksList) {
        linksContainer.style.display = 'block';
        linksList.innerHTML = '';
        const links = tab.quickLinks || [];
        links.forEach((link, idx) => {
            const div = document.createElement('div');
            div.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:5px 8px; border-radius:4px; font-size:0.75rem;";
            div.innerHTML = `<span>${link.icon || '🔗'} ${link.name}</span> <button style="background:none; border:none; color:#ef4444; cursor:pointer;" data-index="${idx}">✕</button>`;
            div.querySelector('button').onclick = () => {
                links.splice(idx, 1);
                saveSettings();
                openEditCustomTab(id); // Reload
                refreshPanelToolbar(id);
            };
            linksList.appendChild(div);
        });
    }

    if (btnDeleteCustomTabConfirm) btnDeleteCustomTabConfirm.style.display = 'block';
    customTabOverlay.classList.remove('hidden');
}

if (btnSaveCustomTab) btnSaveCustomTab.onclick = () => {
    const name = document.getElementById('custom-tab-name').value.trim();
    let url = document.getElementById('custom-tab-url').value.trim();
    const emoji = document.getElementById('custom-tab-emoji').value.trim();

    if (!name || !url) { showToast("⚠️ Name and URL are required!"); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    if (editingTabId) {
        const index = settings.customTabs.findIndex(t => t.id === editingTabId);
        if (index !== -1) {
            settings.customTabs[index].name = name;
            settings.customTabs[index].url = url;
            settings.customTabs[index].emoji = emoji;
        }
    } else {
        const id = "webview_" + Date.now();
        settings.customTabs.push({ id, name, url, emoji });
        // Add to layout of current mode by default so it shows up?
        // Or let user toggle it? For now, let's just add it to current layouts.
        if (!settings.layouts[settings.currentMode]) settings.layouts[settings.currentMode] = [];
        settings.layouts[settings.currentMode].push(id);
    }

    localStorage.setItem('aura_settings', JSON.stringify(settings));
    saveToCloud();
    renderCustomTabs();
    syncCustomPanels();
    customTabOverlay.classList.add('hidden');
    showToast("✅ Custom Webview Saved!");
};

if (btnDeleteCustomTabConfirm) btnDeleteCustomTabConfirm.onclick = () => {
    if (!editingTabId) return;
    if (confirm("Delete this custom webview?")) {
        settings.customTabs = settings.customTabs.filter(t => t.id !== editingTabId);
        // Also remove from all layouts
        Object.keys(settings.layouts).forEach(m => {
            settings.layouts[m] = settings.layouts[m].filter(id => id !== editingTabId);
        });

        // Remove the panel from DOM
        const panel = document.getElementById(`panel-${editingTabId}`);
        if (panel) panel.remove();
        delete panels[editingTabId];
        delete webviews[editingTabId];
        
        localStorage.setItem('aura_settings', JSON.stringify(settings));
        saveToCloud();
        renderCustomTabs();
        customTabOverlay.classList.add('hidden');
        showToast("🗑️ Webview Removed");
    }
};

function renderCustomTabs() {
    const container = document.getElementById('custom-tabs-container');
    if (!container) return;
    container.innerHTML = '';

    settings.customTabs.forEach((tab, index) => {
        const btn = document.createElement('div'); // Using div for better drag handle support
        btn.id = `btn-tab-${tab.id}`;
        btn.className = 'sidebar-btn-wrapper';
        btn.draggable = true;
        
        const isVisible = settings.layouts[settings.currentMode]?.includes(tab.id);
        const iconContent = tab.favicon ? `<img src="${tab.favicon}" style="width:16px; height:16px; border-radius:2px; vertical-align:middle;">` : (tab.emoji || '🌐');
        
        btn.innerHTML = `
            <button class="sidebar-btn ${isVisible ? 'active' : ''}">
                <span class="icon" id="tab-icon-${tab.id}">${iconContent}</span>
                <span class="label">${tab.name}</span>
            </button>
            <button class="sidebar-action-btn" id="btn-edit-tab-${tab.id}">⋮</button>
        `;

        const mainBtn = btn.querySelector('.sidebar-btn');
        mainBtn.onclick = () => {
            const isShowing = settings.layouts[settings.currentMode]?.includes(tab.id);
            toggleView(tab.id, !isShowing);
            renderCustomTabs();
        };

        btn.querySelector('.sidebar-action-btn').onclick = (e) => {
            e.preventDefault();
            openEditCustomTab(tab.id);
        };

        // --- Drag and Drop ---
        btn.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', index);
            btn.classList.add('dragging');
        };
        btn.ondragend = () => btn.classList.remove('dragging');
        btn.ondragover = (e) => {
            e.preventDefault();
            btn.classList.add('drag-over');
        };
        btn.ondragleave = () => btn.classList.remove('drag-over');
        btn.ondrop = (e) => {
            e.preventDefault();
            btn.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                const temp = settings.customTabs[fromIndex];
                settings.customTabs.splice(fromIndex, 1);
                settings.customTabs.splice(toIndex, 0, temp);
                localStorage.setItem('aura_settings', JSON.stringify(settings));
                renderCustomTabs();
            }
        };

        container.appendChild(btn);
    });
}

function syncCustomPanels() {
    const container = document.getElementById('webview-container');
    settings.customTabs.forEach(tab => {
        if (!panels[tab.id]) {
            // Create Panel
            const panel = document.createElement('div');
            panel.className = 'view-panel hidden';
            panel.id = `panel-${tab.id}`;
            panel.setAttribute('data-id', tab.id);
            
            panel.innerHTML = `
                <div class="view-header">
                    <div style="display:flex; align-items:center; flex: 1;">
                        <span class="status-dot" title="Ready"></span>
                        <span class="view-title" style="margin-right:10px;">${tab.name}</span>
                        <input type="text" class="address-bar dynamic-addr" placeholder="Enter URL..." value="${tab.url}"
                            style="flex: 1; height: 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white; padding: 0 10px; font-size: 0.75rem; outline: none;">
                    </div>
                    <div class="view-actions">
                        <button class="btn-focus" title="Focus Mode">⤢</button>
                        <button class="btn-reload" title="Reload Page">🔁</button>
                        <button class="btn-move-left" title="Move Left">◀</button>
                        <button class="btn-move-right" title="Move Right">▶</button>
                        <button class="btn-close-panel" title="Close">✕</button>
                    </div>
                </div>
                <webview id="wv-${tab.id}" src="${tab.url}" partition="persist:${tab.id}" allowpopups></webview>
            `;

            container.appendChild(panel);
            panels[tab.id] = panel;
            const wv = panel.querySelector('webview');
            webviews[tab.id] = wv;

            // Address Bar Logic for dynamic panel
            const addr = panel.querySelector('.dynamic-addr');
            addr.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    let val = addr.value.trim();
                    if (val && !val.startsWith('http')) val = 'https://' + val;
                    wv.src = val;
                    addr.blur();
                }
            });
            wv.addEventListener('did-navigate', () => addr.value = wv.getURL());
            wv.addEventListener('did-navigate-in-page', () => addr.value = wv.getURL());

            // Auto-Favicon Support
            wv.addEventListener('page-favicon-updated', (e) => {
                if (e.favicons && e.favicons.length > 0) {
                    const iconUrl = e.favicons[0];
                    if (tab.favicon !== iconUrl) {
                        tab.favicon = iconUrl;
                        const iconEl = document.getElementById(`tab-icon-${tab.id}`);
                        if (iconEl) iconEl.innerHTML = `<img src="${iconUrl}" style="width:16px; height:16px; border-radius:2px; vertical-align:middle;">`;
                        localStorage.setItem('aura_settings', JSON.stringify(settings));
                    }
                }
            });

            // standard actions
            panel.querySelector('.btn-focus').onclick = () => panel.classList.toggle('fullscreen');
            panel.querySelector('.btn-reload').onclick = () => wv.reload();
            panel.querySelector('.btn-close-panel').onclick = () => toggleView(tab.id, false);
            
            // Move logic
            panel.querySelector('.btn-move-left').onclick = () => movePanel(tab.id, -1);
            panel.querySelector('.btn-move-right').onclick = () => movePanel(tab.id, 1);

            // Design Toolbar for Graphic Design Mode (Custom Workspaces Only)
            if (settings.currentMode === 'graphic-design') {
                injectGDToolbarToPanel(panel);
            }
        } else {
            const title = panels[tab.id].querySelector('.view-title');
            if (title) title.innerText = tab.name;
        }
    });

    // Ensure all panels (including dynamic ones) follow the panelOrder if they are visible
    settings.customTabs.forEach(tab => {
        if (!settings.panelOrder.includes(tab.id)) {
            settings.panelOrder.push(tab.id);
        }
        if (!tab.quickLinks) tab.quickLinks = []; // Migration for existing tabs
    });

    // Final DOM Sort
    settings.panelOrder.forEach(id => {
        const p = panels[id];
        if (p) container.appendChild(p);
    });
}

function injectGDToolbarToPanel(panel) {
    if (panel.querySelector('.gd-inline-tools')) return;
    const actions = panel.querySelector('.view-actions');
    const provider = panel.getAttribute('data-id');
    if (!actions) return;

    // Determine which quick links to use
    let links = [];
    if (provider === 'custom') {
        links = settings.customAIQuickLinks || [];
    } else if (provider.startsWith('custom-')) {
        const tab = settings.customTabs.find(t => t.id === provider);
        links = tab ? (tab.quickLinks || []) : [];
    }

    const gdTools = document.createElement('div');
    gdTools.className = 'gd-inline-tools';
    gdTools.style = "display:flex; gap:4px; margin-right:10px; padding-right:10px; border-right:1px solid rgba(255,255,255,0.1); align-items: center;";
    
    // Render dynamic links
    links.forEach(link => {
        const btn = document.createElement('button');
        btn.className = "icon-only-btn gd-tool-btn";
        btn.title = link.name;
        btn.innerHTML = link.icon || '🔗';
        btn.onclick = () => {
            const wv = panel.querySelector('webview');
            if (wv) wv.src = link.url;
        };
        gdTools.appendChild(btn);
    });

    // Add "+" button to pin current page
    const btnAdd = document.createElement('button');
    btnAdd.className = "icon-only-btn gd-tool-btn";
    btnAdd.style = "opacity: 0.4; font-size: 0.8rem; margin-left: 4px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 4px; width: 20px; height: 20px;";
    btnAdd.title = "Add Current Page to Shortcuts";
    btnAdd.innerHTML = "➕";
    btnAdd.onclick = () => quickAddShortcut(panel);
    gdTools.appendChild(btnAdd);

    actions.parentNode.insertBefore(gdTools, actions);
}

function quickAddShortcut(panel) {
    const wv = panel.querySelector('webview');
    const provider = panel.getAttribute('data-id');
    if (!wv) return;

    const url = wv.getURL();
    const title = wv.getTitle() || "Untitled";
    
    const newLink = { name: title, url: url, icon: '📌' };

    if (provider === 'custom') {
        if (!settings.customAIQuickLinks) settings.customAIQuickLinks = [];
        settings.customAIQuickLinks.push(newLink);
    } else {
        const tab = settings.customTabs.find(t => t.id === provider);
        if (tab) {
            if (!tab.quickLinks) tab.quickLinks = [];
            tab.quickLinks.push(newLink);
        }
    }

    saveSettings();
    // Refresh the toolbar
    removeGDToolbarFromPanel(panel);
    injectGDToolbarToPanel(panel);
    showToast(`📍 Pinned: ${title}`);
}

function removeGDToolbarFromPanel(panel) {
    const gdTools = panel.querySelector('.gd-inline-tools');
    if (gdTools) gdTools.remove();
}

// --- Quick Switcher Logic ---
let qsSelectedIndex = 0;
let qsVisibleItems = [];

function openQuickSwitcher() {
    const overlay = document.getElementById('quick-switcher-overlay');
    const input = document.getElementById('quick-switcher-input');
    if (!overlay || !input) return;
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    qsSelectedIndex = 0;
    renderQSResults('');
}

function renderQSResults(query) {
    const resultsContainer = document.getElementById('quick-switcher-results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';
    
    // Combine all possible targets
    const allItems = [
        { id: 'gemini', name: 'Gemini', icon: '♊' },
        { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' },
        { id: 'claude', name: 'Claude', icon: '🧠' },
        { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
        { id: 'leonardo', name: 'Leonardo AI', icon: '🎨' },
        { id: 'api', name: '🌟 Aura Pro', icon: '✨' },
        ...settings.customTabs.map(t => ({ id: t.id, name: t.name, icon: t.emoji || '🌐', favicon: t.favicon }))
    ];

    qsVisibleItems = allItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    qsVisibleItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `qs-item ${index === qsSelectedIndex ? 'selected' : ''}`;
        const iconHtml = item.favicon ? `<img src="${item.favicon}" style="width:20px; height:20px; border-radius:3px;">` : item.icon;
        
        div.innerHTML = `
            <div class="icon">${iconHtml}</div>
            <div class="name">${item.name}</div>
            <div class="shortcut">↵</div>
        `;
        
        div.onclick = () => {
            switchToView(item.id);
            closeQuickSwitcher();
        };
        
        resultsContainer.appendChild(div);
    });
}

function switchToView(id) {
    toggleView(id, true);
    const wv = webviews[id];
    if (wv) wv.focus();
}

function closeQuickSwitcher() {
    const overlay = document.getElementById('quick-switcher-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Quick Switcher Keyboard Listeners - Unified below
document.getElementById('quick-switcher-input')?.addEventListener('input', (e) => {
    qsSelectedIndex = 0;
    renderQSResults(e.target.value);
});

// Open Store Hook
if (btnOpenStore) {
    btnOpenStore.onclick = () => {
        updateStoreButtons();
        renderCommunityAddons(); // Load community ones too
        storeOverlay.classList.remove('hidden');
    };
}

// Initial Sidebar Community & Custom Tabs Render
setTimeout(() => {
    renderSidebarCommunityModes();
    renderCustomTabs();
    syncCustomPanels();
}, 500);

// Auto Updater Listeners
if (window.electronAPI) {
    const updateStatusEl = document.getElementById('update-status');
    const setUpdateStatus = (text, color, isHtml = false) => {
        if (!updateStatusEl) return;
        if (isHtml) updateStatusEl.innerHTML = text;
        else updateStatusEl.innerText = text;
        updateStatusEl.style.color = color || 'rgba(255,255,255,0.7)';
    };

// IPC Handlers are unified at the top of the file.
}

// Search Listeners
const searchPromptsInput = document.getElementById('search-community-prompts');
if (searchPromptsInput) {
    searchPromptsInput.oninput = () => {
        // Debounce search
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(renderCommunityPrompts, 300);
    };
}

const searchAddonsInput = document.getElementById('search-community-addons');
if (searchAddonsInput) {
    searchAddonsInput.oninput = () => {
        renderCommunityAddons();
    };
}
// Note: Initial load is now handled by onAuthStateChanged!

// --- API MODE (LOCAL AI) INTEGRATION --- //
let apiChatHistory = [];

async function fetchLocalAI(promptText) {
    if (!settings.useApiMode) {
        showToast("⚠️ Local AI Mode is not enabled. Please enable it in Settings.");
        toggleView('api', true);
        applyProviderChange('api');
        return;
    }

    const container = document.getElementById('api-chat-container');
    const modelSelector = document.getElementById('api-model-selector');
    const selectedModel = modelSelector ? modelSelector.value : 'google/gemini-2.5-flash:free';

    // Ensure the panel is visible if not already
    toggleView('api', true);

    // Create User message bubble
    const userMsg = document.createElement('div');
    userMsg.className = 'api-msg user-msg';
    userMsg.innerHTML = `
        <div class="msg-avatar">👤</div>
        <div class="msg-content">${promptText}</div>
    `;
    container.appendChild(userMsg);

    // Create AI loading bubble
    const aiMsg = document.createElement('div');
    aiMsg.className = 'api-msg ai-msg';
    const aiContent = document.createElement('div');
    aiContent.className = 'msg-content';
    aiContent.innerHTML = `
        <div class="msg-header" style="display:flex; align-items:center; gap:5px; margin-bottom:5px; font-size: 0.75rem; color: #fbbf24;">
            <span>✨ Aura AI</span>
            <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
        <div class="ai-text-target"><i>Thinking...</i></div>
    `;
    aiMsg.innerHTML = `<div class="msg-avatar">🤖</div>`;
    aiMsg.appendChild(aiContent);
    container.appendChild(aiMsg);

    const aiTextContainer = aiContent.querySelector('.ai-text-target');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    apiChatHistory.push({ role: "user", content: promptText });

    const endpoint = (settings.openRouterKey || "http://127.0.0.1:11434").trim();
    
    // Validate or Auto-fix URL
    let apiUrl = endpoint;
    if (!apiUrl.startsWith('http')) apiUrl = `http://${apiUrl}`;
    if (!apiUrl.match(/\/v1\/chat\/completions\/?$/)) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/v1/chat/completions`;
    }

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: selectedModel,
                messages: apiChatHistory,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error ? errorData.error.message : response.statusText);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;
        apiChatHistory.push({ role: "assistant", content: reply });

        // Rendering logic...
        displayAIReply(reply, aiContent, aiTextContainer, container);

    } catch (err) {
        console.warn("Local AI Connection Failed. Checking for Cloud Fallback...", err);
        
        const hasGemini = settings.geminiKey && settings.geminiKey.length > 5;
        if (hasGemini) {
            aiTextContainer.innerHTML = `<span style="color: var(--accent); font-size: 0.75rem;">🛰️ Local AI Offline. Switching to Aura-Cloud...</span>`;
            try {
                const cloudReply = await callAI('gemini', promptText);
                displayAIReply(cloudReply, aiContent, aiTextContainer, container);
            } catch (cloudErr) {
                renderAIError(`Both Local & Cloud AI failed: ${cloudErr.message}`, aiTextContainer);
            }
        } else {
            renderAIError(`Local AI Error: ${err.message}. (No Cloud API Key found)`, aiTextContainer);
        }
    }
}

function displayAIReply(reply, aiContent, aiTextContainer, container) {
    aiContent.querySelector('.typing-dots').style.display = 'none';
    aiTextContainer.innerHTML = "";
    let i = 0;
    const speed = 12;
    function typeEffect() {
        if (i < reply.length) {
            aiTextContainer.innerText += reply.charAt(i++);
            container.scrollTop = container.scrollHeight;
            setTimeout(typeEffect, speed);
        } else {
            const formatted = reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            aiTextContainer.innerHTML = formatted;
            addCopyButton(reply, aiContent);
            container.scrollTop = container.scrollHeight;
        }
    }
    typeEffect();
}

function renderAIError(msg, container) {
    container.innerHTML = `<span style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 5px 10px; border-radius: 8px; display: block;">❌ ${msg}</span>`;
}

function addCopyButton(text, container) {
    const btn = document.createElement('button');
    btn.innerHTML = "📋";
    btn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.8rem; margin-top:8px; align-self:flex-end;";
    btn.onclick = () => {
        navigator.clipboard.writeText(text);
        showToast("✅ Copied to clipboard!");
    };
    container.appendChild(btn);
}


// Attach clear chat logic to the reload button of the API panel if element exists
setTimeout(() => {
    const apiPanelBtnReload = document.querySelector('#panel-api .btn-reload');
    if (apiPanelBtnReload) {
        apiPanelBtnReload.onclick = () => {
            // Clear chat
            apiChatHistory = [];
            const container = document.getElementById('api-chat-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 20px;">
                        <p>Welcome to Aura Pro API Mode 🚀</p>
                        <p>Chat cleared.</p>
                    </div>
                `;
            }
        };
    }
}, 1000);
// --- END API MODE --- //
// --- PANEL RESIZE LOGIC (DRAG EDGE) --- //
let isResizing = false;
let currentPanel = null;
let startX = 0;
let startWidth = 0;

document.getElementById('webview-container').addEventListener('mousedown', (e) => {
    // Check if clicking near the right edge of a view-panel
    const panel = e.target.closest('.view-panel');
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const edgeSize = 10;

    // Only allow resizing in 'scroll' layout or if user specifically wants it
    // Grid and Split layouts have fixed flex logic that might fight with width
    if (e.clientX > rect.right - edgeSize) {
        isResizing = true;
        currentPanel = panel;
        startX = e.clientX;
        startWidth = rect.width;
        document.body.style.cursor = 'col-resize';
        panel.style.transition = 'none'; // smoother

        // Show overlay on webviews so they don't eat mouse events
        Object.values(webviews).forEach(wv => {
            if (wv) wv.style.pointerEvents = 'none';
        });
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isResizing || !currentPanel) return;

    const newWidth = startWidth + (e.clientX - startX);
    if (newWidth > 200) {
        // We Use flex-basis for flexibility or just fixed width
        currentPanel.style.flex = `0 0 ${newWidth}px`;
        currentPanel.style.width = `${newWidth}px`;
    }
});

window.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        if (currentPanel) currentPanel.style.transition = '';

        Object.values(webviews).forEach(wv => {
            if (wv) wv.style.pointerEvents = 'auto';
        });

        currentPanel = null;
    }
});
// --- END RESIZE LOGIC --- //

// --- END PRO UTILITIES --- //

// --- QUICK EXPORT TO CLIPBOARD --- //
// [TH] จัดการการคัดลอกเนื้อหาจาก AI ไปยัง Clipboard
document.getElementById('webview-container').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-export-clipboard');
    if (!btn) return;

    const panel = btn.closest('.view-panel');
    if (!panel) return;
    const provider = panel.getAttribute('data-id');
    const wv = webviews[provider];

    if (!wv) {
        showToast("⚠️ Cannot export from this panel.");
        return;
    }

    try {
        btn.innerText = "⏳ ...";
        btn.disabled = true;

        // Try to get text response first
        const text = await wv.executeJavaScript(`
            (function() {
                const selectors = ['.markdown', '.message-content', 'article', '.response-block'];
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el) return el.innerText;
                }
                return "";
            })()
        `);

        if (text) {
            navigator.clipboard.writeText(text);
            showToast(`📋 Text from ${provider} copied!`);
        } else {
            // If no text, capture as image (useful for image generators like Leonardo)
            const image = await wv.capturePage();
            window.electronAPI.send('toMain', { type: 'copy-image-to-clipboard', image: image.toDataURL() });
            showToast(`🖼️ Screenshot from ${provider} copied!`);
        }
    } catch (err) {
        showToast("❌ Export failed: " + err.message);
    } finally {
        btn.innerText = "📋 Copy";
        btn.disabled = false;
    }
});

// --- Creative Suite UI Toggle --- //
// [TH] จัดการการสลับหน้าตาโปรแกรมสำหรับโหมดงานสร้างสรรค์
function updateCreativeModeUI(mode) {
    if (mode === 'graphic-design' || mode === 'creative') {
        document.body.classList.add('creative-suite');
    } else {
        document.body.classList.remove('creative-suite');
    }
}

// --- Tabbed Settings Initialization --- //
// [TH] ตัวจัดการการคลิกเปลี่ยน Tab ในหน้า Settings ใหม่
function initTabbedSettings() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(target);
            if (targetPane) {
                targetPane.classList.add('active');
                if (target === 'tab-local-ai') refreshLocalAIStatus();
            }
        };
    });

    const btnSave = document.getElementById('btn-save-settings');
    if (btnSave) btnSave.onclick = () => {
        saveSettings();
    };
    
    const btnCancel = document.getElementById('btn-cancel-settings');
    if (btnCancel) btnCancel.onclick = () => document.getElementById('settings-overlay').classList.add('hidden');
    
    const btnCloseX = document.getElementById('btn-close-settings');
    if (btnCloseX) btnCloseX.onclick = () => document.getElementById('settings-overlay').classList.add('hidden');

    const btnResetOnboarding = document.getElementById('btn-reset-onboarding');
    if (btnResetOnboarding) {
        btnResetOnboarding.onclick = () => {
            localStorage.removeItem('aura_onboarding_version');
            window.location.reload();
        };
    }
}

// ── Aura Local AI Dashboard Logic (Phase 16) ──
async function refreshLocalAIStatus() {
    const heartbeat = document.getElementById('ollama-heartbeat');
    const statusText = document.getElementById('ollama-status-text');
    const endpoint = (settings.openRouterKey || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
    
    if (!statusText) return;
    statusText.innerText = "🔍 Checking connection...";
    heartbeat.classList.remove('online');

    const isOnline = await checkLocalAIConnection();
    
    if (isOnline) {
        try {
            const resp = await fetch(`${endpoint}/api/tags`);
            const data = await resp.json();
            heartbeat.classList.add('online');
            statusText.innerHTML = `<span style="color: #10b981; font-weight: bold;">✅ Connected to Ollama</span>`;
            renderLocalModelCards(data.models || []);
        } catch (err) {
            handleOfflineState(heartbeat, statusText);
        }
    } else {
        handleOfflineState(heartbeat, statusText);
    }
}

function handleOfflineState(heartbeat, statusText) {
    heartbeat.classList.remove('online');
    statusText.innerHTML = `<span style="color: #ef4444;">❌ Offline: Please start Ollama</span>`;
    renderLocalModelCards([]); // Show recommendations
}

function renderLocalModelCards(installedModels) {
    const container = document.getElementById('local-model-list-pro');
    if (!container) return;
    container.innerHTML = '';

    const installedNames = installedModels.map(m => m.name.split(':')[0]);
    
    const recommendations = [
        { name: 'llama3.2', desc: 'Fast & Smart (3B)', details: '<b>Pros:</b> Fast, Private, Versatile. <br><b>Cons:</b> Smaller knowledge base.', size: '~2.5GB' },
        { name: 'mistral', desc: 'Powerful & Precise (7B)', details: '<b>Pros:</b> Very accurate, Great for coding. <br><b>Cons:</b> Heavier (4.1GB).', size: '~4.1GB' }
    ];

    recommendations.forEach(rec => {
        const isInstalled = installedNames.includes(rec.name);
        const card = document.createElement('div');
        card.className = 'model-card-item';
        card.innerHTML = `
            <div class="model-info">
                <strong>${rec.name.toUpperCase()}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${rec.desc} | Size: ${rec.size}</div>
                <div class="model-pros-cons" style="margin-top:8px; font-size: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top:8px;">
                    ${rec.details}
                </div>
            </div>
            <div class="model-actions">
                ${isInstalled 
                    ? `<button class="wizard-btn-sm btn-delete-model" onclick="manageModel('delete', '${rec.name}')">🗑️ Delete</button>` 
                    : `<button class="wizard-btn-sm" onclick="manageModel('pull', '${rec.name}')">📥 Install</button>`}
            </div>
        `;
        container.appendChild(card);
    });
}

async function manageModel(action, name) {
    const endpoint = (settings.openRouterKey || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
    showToast(`⏳ ${action === 'pull' ? 'Installing' : 'Deleting'} ${name}...`);
    
    try {
        const resp = await fetch(`${endpoint}/api/${action}`, {
            method: 'POST',
            body: JSON.stringify({ name: name })
        });
        
        if (resp.ok) {
            showToast(`✅ Success: ${name} ${action === 'pull' ? 'installed' : 'deleted'}.`);
            setTimeout(refreshLocalAIStatus, 2000);
        } else {
            throw new Error(`Ollama ${action} failed.`);
        }
    } catch (err) {
        showToast(`❌ Error: ${err.message}`);
    }
}
// Expose to window for inline onclick handlers (index.html)
window.refreshLocalAIStatus = refreshLocalAIStatus;
window.checkLocalAIConnection = checkLocalAIConnection; // Legacy alias
window.manageModel = manageModel;
window.installOllamaEngine = installOllamaEngine;

async function installOllamaEngine() {
    const btn = document.getElementById('btn-download-ollama-pro');
    const progressContainer = document.getElementById('ollama-download-container');
    const progressFill = document.getElementById('ollama-progress-bar');
    const progressPercent = document.getElementById('download-percent-label');
    const statusLabel = document.getElementById('download-status-label');

    if (!btn) return;

    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.innerText = "⏳ Initializing Download...";
    
    if (progressContainer) progressContainer.style.display = 'block';

    const isMac = window.electronAPI && window.electronAPI.isMac;
    const downloadUrl = isMac 
        ? "https://ollama.com/download/Ollama-darwin.zip" 
        : "https://ollama.com/download/OllamaSetup.exe";

    try {
        // [TH] ใช้ระบบ Download Engine ใหม่ที่ผมเพิ่งอัปเกรดให้ครับ มี Progress Bar วิ่งในแอปเลย!
        // [EN] Trigger the new Integrated Downloader with real-time UI updates.
        
        const progressHandler = (data) => {
            if (data.type === 'download-progress') {
                const p = data.percent;
                if (progressFill) progressFill.style.width = `${p}%`;
                if (progressPercent) progressPercent.innerText = `${p}%`;
                if (statusLabel) statusLabel.innerText = p < 100 ? `⏳ Downloading... (${(data.received / 1024 / 1024 || 0).toFixed(1)}MB)` : "✅ Finished!";
                btn.innerText = `⏳ Download: ${p}%`;
                
                if (p === 100) {
                     btn.innerText = "⚡ Installer Opened";
                     btn.style.background = "#06b6d4"; 
                     
                     // [TH] เมื่อติดตั้งเสร็จ ให้เปิดโหมด Local AI ให้อัตโนมัติเลยครับ
                     updateAddonState('localAI', { installed: true, enabled: true });
                     settings.useApiMode = true;
                     saveSettings(); // Save to localStorage & Cloud
                     
                     showToast("🏠 Local AI Enabled! After installer finishes, you can start chatting.");
                }
            } else if (data.type === 'download-error') {
                showToast("❌ Download Failed: " + data.message);
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.innerText = "🚀 1-Click Install Ollama";
                if (progressContainer) progressContainer.style.display = 'none';
            }
        };

        window.electronAPI.receive('fromMain', progressHandler);

        // [BUG FIX] เรียกใช้ API ตามที่ระบุใน preload.js (invoke แทน send)
        const result = await window.electronAPI.downloadEngine(downloadUrl);
        // Note: download-engine returns a promise that resolves when download FINISHES
        
        showToast("✅ Download Complete! Opening installer...");
    } catch (err) {
        showToast("❌ Download Failed: " + err.message);
        console.error(err);
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerText = "🚀 1-Click Install Ollama";
        if (progressContainer) progressContainer.style.display = 'none';
    }
}

// [Ultimate Polish] Performance Guard: Reduced Motion / Low End Detection
function checkPerformanceGuard() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Auto-disable blur on very low window sizes or if system prefers low motion
    if (prefersReducedMotion || window.innerWidth < 600) {
        document.body.classList.add('no-blur');
        console.log("[Aura AI] Performance Guard: Glassmorphism Blur Disabled.");
    }
}

// [Ultimate Polish] Onboarding v1.3: Guided Tour
async function initOnboardingv13() {
    const currentVer = "1.3";
    const savedVer = localStorage.getItem('aura_onboarding_version');
    
    if (savedVer === currentVer) return;
    
    // Welcome delayed Toast
    setTimeout(() => {
        showToast("🌟 Welcome to Aura AI Pro v1.3!", 5000);
        
        // Simple step-by-step tour using glowing effects
        const tourSteps = [
            { el: '#hub-input', msg: "1. Type here. We'll auto-target your active AI window! 🎯" },
            { el: '#btn-mini-mode', msg: "2. Toggle Small UI for a distraction-free experience. 🏙️" },
            { el: '#toggle-addons', msg: "3. Expand Add-ons for specialized E-com & Japanese tools. 🔌" },
            { el: '#layout-style', msg: "4. Change layouts (Split, Grid, Scroll) here! 📦" }
        ];
        
        let stepIdx = 0;
        const nextStep = () => {
            if (stepIdx >= tourSteps.length) {
                localStorage.setItem('aura_onboarding_version', currentVer);
                showToast("✅ Tour finished! Press Alt+Q anytime to start translating.");
                return;
            }
            
            const step = tourSteps[stepIdx];
            const target = document.querySelector(step.el);
            if (target) {
                target.classList.add('glow-pulse');
                showToast(step.msg, 4000);
                setTimeout(() => {
                    target.classList.remove('glow-pulse');
                    stepIdx++;
                    nextStep();
                }, 4500);
            } else {
                stepIdx++;
                nextStep();
            }
        };
        
        nextStep();
    }, 2000);
}

// Settings button trigger (Sidebar Footer)
const btnSettingsSidebar = document.getElementById('btn-settings');
if (btnSettingsSidebar) {
    btnSettingsSidebar.onclick = () => {
        document.getElementById('settings-overlay')?.classList.remove('hidden');
    };
}

// --- SMART SUGGESTIONS (Hidden Power) --- //
// [TH] ระบบแนะนำฟีเจอร์อัจฉริยะ (ไม่รำคาญ)
let lastClipboardText = "";
function initSmartSuggestions() {
    // Only suggest if Translate Overlay is installed but DISABLED
    const isTransActive = isAddonActive('translateOverlay');
    const isTransInstalled = settings.addons && settings.addons.translateOverlay && settings.addons.translateOverlay.installed;
    
    if (isTransActive || !isTransInstalled) return;

    setInterval(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || text === lastClipboardText) return;
            lastClipboardText = text;

            // 1. Password/URL Filter
            if (text.length > 50) return; // Too long for a quick translate suggestion
            if (text.startsWith('http') || text.startsWith('https')) return;
            if (/[0-9]/.test(text) && /[!@#$%^&*]/.test(text) && text.length > 8) return; // Basic password detection
            
            // 2. Cooldown & Frequency Guards
            const now = Date.now();
            const suggestionState = JSON.parse(localStorage.getItem('aura_suggestion_state') || '{"lastTime":0,"count":0,"date":""}');
            const today = new Date().toISOString().split('T')[0];

            if (suggestionState.date !== today) {
                suggestionState.count = 0;
                suggestionState.date = today;
            }

            if (suggestionState.count >= 2) return; // Max 2 per day
            if (now - suggestionState.lastTime < 10 * 60 * 1000) return; // 10 min cooldown

            // 3. Show Suggestion
            showSmartSuggestionPopup(text);

            // Update State
            suggestionState.lastTime = now;
            suggestionState.count++;
            localStorage.setItem('aura_suggestion_state', JSON.stringify(suggestionState));

        } catch (e) {
            // Clipboard might be blocked or empty
        }
    }, 5000); // Check every 5s
}

function showSmartSuggestionPopup(text) {
    const toast = document.createElement('div');
    toast.className = 'glass-card smart-suggestion-popup';
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 280px; padding: 16px; 
        z-index: 99999; border: 1px solid var(--border-hover); box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    toast.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
            <div style="font-size:1.5rem;">🧠</div>
            <div style="flex:1;">
                <p style="margin:0; font-size:0.85rem; font-weight:700;">Translate this instantly?</p>
                <p style="margin:4px 0 0 0; font-size:0.75rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">"${text}"</p>
            </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
            <button id="btn-suggest-enable" style="flex:1; background:var(--accent); border:none; color:white; padding:6px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">Enable Translate</button>
            <button id="btn-suggest-close" style="background:rgba(255,255,255,0.05); border:none; color:var(--text-muted); padding:6px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;">Not now</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    toast.querySelector('#btn-suggest-enable').onclick = () => {
        updateAddonState('translateOverlay', { enabled: true });
        showToast("✨ Translate Overlay Enabled! Press Alt+Q to use.");
        toast.remove();
    };
    
    toast.querySelector('#btn-suggest-close').onclick = () => toast.remove();
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 8000);
}

// Final Initialization Call
setTimeout(() => {
    initTabbedSettings();
    checkPerformanceGuard();
    initOnboardingv13();
    initSmartSuggestions(); // New Feature 3.0
}, 500);
