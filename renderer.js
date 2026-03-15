// --- Explanation / 説明 / คำอธิบาย ---
// [EN] Renderer Process: Handles the logic inside the window (UI).
// [JP] レンダラー・プロセス (Renderer Process): ウィンドウ内のロジック（UI）を担当します。
// [TH] Renderer Process: จัดการตรรกะและการทำงานต่างๆ ภายในหน้าต่างโปรแกรม (ส่วนติดต่อผู้ใช้)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, limit, orderBy, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

// Authentication Logic
let currentUser = null;
window.USER_DOC_REF = null;
let lastPrompt = '';

// Title Bar Controls
const btnMinWin = document.getElementById('btn-min-win');
const btnMaxWin = document.getElementById('btn-max-win');
const btnCloseWin = document.getElementById('btn-close-win');

if (btnMinWin) btnMinWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'minimize' });
if (btnMaxWin) btnMaxWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'maximize' });
if (btnCloseWin) btnCloseWin.onclick = () => window.electronAPI.send('toMain', { type: 'window-control', action: 'close' });

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
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

// Mode Button Constants (Legacy/Hardcoded)
const btnGeneral = document.getElementById('btn-general');
const btnEcommerce = document.getElementById('btn-ecommerce');
const btnJapanese = document.getElementById('btn-japanese');

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

        try {
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
        const provider = new GoogleAuthProvider();
        if (authError) authError.classList.add('hidden');
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            showError(error.message.replace('Firebase: ', ''));
        }
    };
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
        showToast(`👋 Welcome back, ${user.email || 'Pro User'}!`);

        // Initialize App Setup only after login
        loadSettings();
        switchMode(settings.currentMode || 'general');
    } else {
        // User is signed out
        currentUser = null;
        window.USER_DOC_REF = null;
        if (authOverlay) authOverlay.classList.remove('hidden'); // Show login screen
        if (authForm) authForm.classList.remove('hidden');
        if (verifySection) verifySection.classList.add('hidden');
        if (authTitle) authTitle.innerText = "Welcome to Aura AI";
    }
});

const promptList = document.getElementById('prompt-list');

// Add-on Store References
const storeOverlay = document.getElementById('store-overlay');
const btnOpenStore = document.getElementById('btn-open-store');
const btnCloseStore = document.getElementById('btn-close-store');
const btnDoneStore = document.getElementById('btn-done-store');
const storeItems = document.querySelectorAll('.store-btn-install');
const createAddonOverlay = document.getElementById('create-addon-overlay');
const btnOpenCreateAddon = document.getElementById('btn-open-create-addon');
const btnCloseCreateAddon = document.getElementById('btn-close-create-addon');
const btnPublishAddon = document.getElementById('btn-publish-addon');
const communityAddonList = document.getElementById('community-addon-list');

// Toast Notification System (L้ำๆ)
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message.replace(/\n/g, '<br>');
    container.appendChild(toast);

    // Auto remove with animation
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.5s forwards';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, 3500);
}

const webviews = {
    gemini: document.getElementById('wv-gemini'),
    chatgpt: document.getElementById('wv-chatgpt'),
    claude: document.getElementById('wv-claude'),
    deepseek: document.getElementById('wv-deepseek'),
    leonardo: document.getElementById('wv-leonardo'),
    custom: document.getElementById('wv-custom')
};

const panels = {
    gemini: document.getElementById('panel-gemini'),
    chatgpt: document.getElementById('panel-chatgpt'),
    claude: document.getElementById('panel-claude'),
    deepseek: document.getElementById('panel-deepseek'),
    leonardo: document.getElementById('panel-leonardo'),
    api: document.getElementById('panel-api'),
    custom: document.getElementById('panel-custom'),
    dashboard: document.getElementById('panel-dashboard')
};

// --- Add event listeners for webview loading states (Status Indicator) ---
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

// Panel Toggle Logic
function toggleView(provider, show) {
    const panel = panels[provider];
    const btn = document.querySelector(`.ai-toggle[data-provider="${provider}"]`);
    if (!panel) return;

    if (show) {
        panel.classList.remove('hidden');
        if (btn) btn.classList.add('active');
        // Hide dashboard if any panel is shown
        if (panels.dashboard) panels.dashboard.classList.add('hidden');
    } else {
        panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');

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

// Remove hardcoded top toggles logic and replace with dynamic function
function renderToggles() {
    const container = document.getElementById('dynamic-toggles');
    if (!container) return;
    container.innerHTML = '';

    const names = {
        gemini: 'Gemini', chatgpt: 'ChatGPT', claude: 'Claude',
        deepseek: 'DeepSeek', leonardo: 'Leonardo AI', api: '🌟 Aura Pro', custom: settings.customAIName || 'Custom AI'
    };

    settings.panelOrder.forEach(provider => {
        if (provider === 'gemini' && settings.showGemini === false) return;
        if (provider === 'chatgpt' && settings.showChatGPT === false) return;
        if (provider === 'claude' && settings.showClaude === false) return;
        if (provider === 'deepseek' && settings.showDeepSeek === false) return;
        if (provider === 'leonardo' && settings.showLeonardo === false) return;
        if (provider === 'custom' && !settings.showCustomAI) return;
        if (provider === 'api' && !settings.useApiMode) return; // Hide API tab if Pro Mode is off

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

// --- Section removed due to duplication ---

// Prompt Data / プロンプトデータ / ข้อมูลคำสั่ง
let customPrompts = {}; // loaded from settings

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
        { label: "📦 Bundle Ideas", text: "Suggest 3 product bundle ideas for [YOUR PRODUCT] to increase AOV:" },
        { label: "💬 Customer FAQ", text: "Write 3 professional FAQ entries for [YOUR PRODUCT] regarding shipping and returns:" }
    ],
    japanese: [
        { label: "📝 Grammar Breakdown", text: "Please break down the grammar and particles of this sentence: [PASTE SENTENCE]" },
        { label: "🔄 Natural", text: "Translate this to natural Japanese (polite/casual): [YOUR TEXT]" },
        { label: "🈁 Kanji Analysis", text: "Explain the Kanji components and readings of: [YOUR KANJI]" },
        { label: "🃏 Anki Card", text: "Based on this sentence, create a format for an Anki card (Expression, Meaning, Reading, Sample Sentence):" },
        { label: "🎭 Polite vs Casual", text: "How would you say this sentence differently in Keigo (Polite) vs Casual form: [YOUR TEXT]" }
    ]
};

function getActivePrompts(mode) {
    if (settings.customPrompts && settings.customPrompts[mode]) {
        return settings.customPrompts[mode];
    }
    return defaultPrompts[mode] || [];
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
        const shortcut = index < 5 ? ` [Alt+${index + 1}]` : '';
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

btnSendRaw.onclick = () => {
    const val = hubInput.value;
    if (val.trim()) {
        injectToAI(val);
        hubInput.value = ''; // Auto clear after sending
    }
};

// Allow pressing Enter to send
hubInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        injectToAI(hubInput.value);
    }
});

// Shortcut Hotkeys for Prompts (Alt + 1-5)
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const activePrompts = getActivePrompts(settings.currentMode);
        if (activePrompts[index]) {
            const p = activePrompts[index];
            const userInput = hubInput ? hubInput.value.trim() : '';
            const fullPrompt = p.text.replace('[YOUR PRODUCT]', userInput)
                .replace('[YOUR TOPIC]', userInput)
                .replace('[PASTE SENTENCE]', userInput)
                .replace('[YOUR TEXT]', userInput)
                .replace('[YOUR KANJI]', userInput);
            injectToAI(fullPrompt);
            showToast(`🚀 Sent Prompt: ${p.label}`);
        }
    }
});


function renderPrompts(mode) {
    promptList.innerHTML = '';
    const activePrompts = getActivePrompts(mode);
    activePrompts.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        const shortcut = index < 5 ? ` (Alt+${index + 1})` : '';
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

    // Hide all panels
    Object.keys(panels).forEach(p => toggleView(p, false));

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

    const hubSelector = document.getElementById('hub-ai-selector');
    if (hubSelector) hubSelector.value = settings.provider || 'gemini';
    localStorage.setItem('aura_settings', JSON.stringify(settings));
}

if (btnGeneral) btnGeneral.addEventListener('click', () => switchMode('general'));
if (btnEcommerce) btnEcommerce.addEventListener('click', () => switchMode('ecommerce'));
if (btnJapanese) btnJapanese.addEventListener('click', () => switchMode('japanese'));

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

// IPC Listeners for Shortcuts from Main Process
// メインプロセスからのショートカット (Shortcut kara main process)
window.electronAPI.receive('fromMain', (arg) => {
    if (arg.type === 'shortcut-triggered') {
        if (arg.action === 'send-prompt') {
            injectToAI(hubInput.value);
        } else if (arg.action === 'toggle-sidebar') {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('collapsed');
            console.log("Sidebar Toggled via Main Process");
        }
    } else if (arg.type === 'screenshot-captured') {
        btnScreenshot.innerText = "📸 Screenshot";
        showToast("✅ Capture Success!\n[TH] ก๊อปรูปลง Clipboard แล้วครับ กด Ctrl+V ที่แชทได้เลย!");
    }
});


// Settings & Persistence Logic
// 設定の管理 (Settei no kanri) - การจัดการการตั้งค่า
let settings = {
    provider: 'gemini',
    usePrefix: false,
    prefix: 'I am studying {}. ',
    useSuffix: true,
    suffix: ' Please explain in Thai.',
    autoSend: false,
    autoRead: false,
    theme: 'dark',
    showEcommerce: false,
    showJapanese: false,
    layouts: {
        general: ['gemini', 'chatgpt'],
        ecommerce: ['gemini', 'leonardo'],
        japanese: ['gemini', 'claude']
    },
    panelOrder: ['gemini', 'chatgpt', 'claude', 'deepseek', 'leonardo', 'custom'],
    currentMode: 'general',
    customAIUrl: '',
    customAIName: 'Custom AI',
    showCustomAI: false,
    showGemini: true,
    showChatGPT: true,
    showClaude: true,
    showDeepSeek: true,
    showLeonardo: true,
    username: '',
    communityAlias: '',
    communityModes: [],
    customPrompts: null, // null means use defaultPrompts
    useApiMode: false,
    openRouterKey: ''
};

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

    // Switch to general if the active mode was hidden
    if (settings.currentMode === 'ecommerce' && settings.showEcommerce === false) settings.currentMode = 'general';
    if (settings.currentMode === 'japanese' && settings.showJapanese === false) settings.currentMode = 'general';

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
    const chkAutoSend = document.getElementById('set-auto-send');
    if (chkAutoSend) chkAutoSend.checked = settings.autoSend;
    if (document.getElementById('set-show-ecommerce')) document.getElementById('set-show-ecommerce').checked = settings.showEcommerce !== false;
    if (document.getElementById('set-show-japanese')) document.getElementById('set-show-japanese').checked = settings.showJapanese !== false;
    const chkRead = document.getElementById('set-auto-read');
    if (chkRead) chkRead.checked = settings.autoRead;

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

    // Sync the Top Hub Selector options based on visibility
    const hubSelector = document.getElementById('hub-ai-selector');
    if (hubSelector) {
        const options = hubSelector.querySelectorAll('option');
        options.forEach(opt => {
            const val = opt.value;
            if (val === 'gemini') opt.style.display = settings.showGemini !== false ? 'block' : 'none';
            if (val === 'chatgpt') opt.style.display = settings.showChatGPT !== false ? 'block' : 'none';
            if (val === 'claude') opt.style.display = settings.showClaude !== false ? 'block' : 'none';
            if (val === 'deepseek') opt.style.display = settings.showDeepSeek !== false ? 'block' : 'none';
            if (val === 'leonardo') opt.style.display = settings.showLeonardo !== false ? 'block' : 'none';
            if (val === 'custom') opt.style.display = settings.showCustomAI ? 'block' : 'none';
            if (val === 'api') opt.style.display = settings.useApiMode ? 'block' : 'none';
        });

        // If current provider is hidden, switch to the first visible one
        if (hubSelector.selectedOptions[0] && hubSelector.selectedOptions[0].style.display === 'none') {
            const firstVisible = Array.from(options).find(o => o.style.display !== 'none');
            if (firstVisible) {
                hubSelector.value = firstVisible.value;
                settings.provider = firstVisible.value;
            }
        } else {
            hubSelector.value = settings.provider;
        }
    }

    // Pro Mode state update
    const proUtils = document.getElementById('pro-utilities');
    if (proUtils) proUtils.style.display = settings.useApiMode ? 'flex' : 'none';

    const chkApiMode = document.getElementById('set-use-api-mode');
    if (chkApiMode) chkApiMode.checked = settings.useApiMode === true;
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
    }
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
        if (settings.showLeonardo === undefined) settings.showLeonardo = true;

        if (!settings.currentMode) settings.currentMode = 'general';
        if (!settings.customPrompts) settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
    } else {
        settings.customPrompts = JSON.parse(JSON.stringify(defaultPrompts));
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

    // Initiate background sync with Firestore
    syncWithCloud();
}

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
        if (chkAutoSend) settings.autoSend = chkAutoSend.checked;

        let chkAutoRead = document.getElementById('set-auto-read');
        if (chkAutoRead) settings.autoRead = chkAutoRead.checked;

        let chkEcom = document.getElementById('set-show-ecommerce');
        if (chkEcom) settings.showEcommerce = chkEcom.checked;

        let chkJpn = document.getElementById('set-show-japanese');
        if (chkJpn) settings.showJapanese = chkJpn.checked;

        let chkCustom = document.getElementById('set-show-custom');
        if (chkCustom) settings.showCustomAI = chkCustom.checked;

        let txtCustomName = document.getElementById('set-custom-name');
        if (txtCustomName) settings.customAIName = txtCustomName.value.trim() || 'Custom AI';

        let txtCustomUrl = document.getElementById('set-custom-url');
        if (txtCustomUrl) settings.customAIUrl = txtCustomUrl.value.trim();

        let txtAlias = document.getElementById('set-alias');
        if (txtAlias) settings.communityAlias = txtAlias.value.trim();

        let chkApiMode = document.getElementById('set-use-api-mode');
        if (chkApiMode) settings.useApiMode = chkApiMode.checked;

        // Save visibility flags
        if (document.getElementById('set-show-gemini')) settings.showGemini = document.getElementById('set-show-gemini').checked;
        if (document.getElementById('set-show-chatgpt')) settings.showChatGPT = document.getElementById('set-show-chatgpt').checked;
        if (document.getElementById('set-show-claude')) settings.showClaude = document.getElementById('set-show-claude').checked;
        if (document.getElementById('set-show-deepseek')) settings.showDeepSeek = document.getElementById('set-show-deepseek').checked;
        if (document.getElementById('set-show-leonardo')) settings.showLeonardo = document.getElementById('set-show-leonardo').checked;

        let txtApiKey = document.getElementById('set-openrouter-key');
        if (txtApiKey) settings.openRouterKey = txtApiKey.value.trim();

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

function applyProviderChange(provider) {
    let hubSelect = document.getElementById('hub-ai-selector');
    if (hubSelect) hubSelect.value = provider;
    // ensure the target provider's panel is visible
    toggleView(provider, true);
    console.log(`Switched Target Provider to: ${provider}`);
}

// Shortcuts Manager
// ショートカット (Shortcut) - คีย์ลัด
window.addEventListener('keydown', (e) => {
    // [Ctrl + H] -> Send Prompt from Hub
    if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (e.shiftKey) {
            broadcastPrompt(hubInput.value);
        } else {
            injectToAI(hubInput.value);
        }
    }
    // [Ctrl + G] -> Toggle Sidebar
    if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed'); // Need to add CSS for this
        console.log("Sidebar Toggled");
    }
    // [Esc] -> Close Settings Modal
    if (e.key === 'Escape') {
        document.getElementById('settings-overlay').classList.add('hidden');
    }
});

// Sync Hub Selector with Provider
document.getElementById('hub-ai-selector').onchange = (e) => {
    settings.provider = e.target.value;
    applyProviderChange(settings.provider);
};

// Broadcast Logic
document.getElementById('btn-broadcast').onclick = () => broadcastPrompt(hubInput.value);

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

                if (${settings.autoSend}) {
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
    if (settings.provider === 'api') return 'api';
    const wv = webviews[settings.provider];
    const panel = panels[settings.provider];
    if (wv && panel && !panel.classList.contains('hidden')) return wv;

    // Fallback: the first visible panel
    const visiblePanel = Object.values(panels).find(p => p && !p.classList.contains('hidden'));
    if (visiblePanel) {
        const id = visiblePanel.getAttribute('data-id');
        return id === 'api' ? 'api' : webviews[id];
    }
    return null;
}

async function injectToAI(text) {
    if (!text || !text.trim()) return;
    lastPrompt = text;
    const target = getTargetWebview();

    if (target === 'api') {
        fetchOpenRouter(text);
    } else if (target) {
        injectToSpecificAI(target, text);
        showToast(`🚀 Prompt Sent to ${settings.provider.toUpperCase()}!`);
    } else {
        showToast("⚠️ No visible AI panel to receive prompt.");
    }
    if (hubInput) hubInput.value = ''; // Auto clear
}

// UI Event Listeners & Global Controls
const btnThemeToggleConsolidated = document.getElementById('btn-theme-toggle');
if (btnThemeToggleConsolidated) {
    btnThemeToggleConsolidated.onclick = () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        btnThemeToggleConsolidated.innerText = isLight ? '☀️' : '🌙';
        settings.theme = isLight ? 'light' : 'dark';
        localStorage.setItem('aura_settings', JSON.stringify(settings));
    };
}

const btnSettingsConsolidated = document.getElementById('btn-settings');
if (btnSettingsConsolidated) {
    btnSettingsConsolidated.onclick = () => {
        document.getElementById('settings-overlay').classList.remove('hidden');
    };
}

const btnCloseSettings = document.getElementById('btn-close-settings');
if (btnCloseSettings) {
    btnCloseSettings.onclick = () => {
        document.getElementById('settings-overlay').classList.add('hidden');
    };
}
const btnSaveSettings = document.getElementById('btn-save-settings');
if (btnSaveSettings) btnSaveSettings.onclick = saveSettings;

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
            (addon === 'japanese' && settings.showJapanese);

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

if (btnOpenStore) {
    btnOpenStore.onclick = () => {
        updateStoreButtons();
        storeOverlay.classList.remove('hidden');
    };
}

if (btnCloseStore) btnCloseStore.onclick = () => storeOverlay.classList.add('hidden');
if (btnDoneStore) btnDoneStore.onclick = () => storeOverlay.classList.add('hidden');

storeItems.forEach(btn => {
    btn.onclick = () => {
        const addon = btn.getAttribute('data-addon');
        if (addon === 'ecommerce') {
            settings.showEcommerce = !settings.showEcommerce;
            showToast(settings.showEcommerce ? "✅ E-commerce Pro Installed!" : "🗑️ E-commerce Pro Uninstalled.");
        } else if (addon === 'japanese') {
            settings.showJapanese = !settings.showJapanese;
            showToast(settings.showJapanese ? "✅ Japanese Tutor Installed!" : "🗑️ Japanese Tutor Uninstalled.");
        }

        localStorage.setItem('aura_settings', JSON.stringify(settings));
        applySettingsToUI();
        saveToCloud(); // Save installation status
        updateStoreButtons();
    };
});

// Expose window functions for UI hooks defined in HTML
window.showToast = showToast;

// --- Community Add-on Management ---
let editingAddonId = null;

if (btnOpenCreateAddon) btnOpenCreateAddon.onclick = () => {
    editingAddonId = null;
    document.getElementById('create-modal-title').innerText = "✨ Create Workspace";
    document.getElementById('addon-name').value = "";
    document.getElementById('addon-emoji').value = "🖋️";
    document.getElementById('addon-desc').value = "";
    document.getElementById('chk-publish-public').checked = false;
    createAddonOverlay.classList.remove('hidden');
};

if (btnCloseCreateAddon) btnCloseCreateAddon.onclick = () => createAddonOverlay.classList.add('hidden');

function openEditAddon(id) {
    const mode = settings.communityModes.find(m => m.id === id);
    if (!mode) return;

    editingAddonId = id;
    document.getElementById('create-modal-title').innerText = "⚙️ Edit Workspace";
    document.getElementById('addon-name').value = mode.name;
    document.getElementById('addon-emoji').value = mode.emoji;
    document.getElementById('addon-desc').value = mode.description || "";
    document.getElementById('chk-publish-public').checked = mode.isPublic || false;
    createAddonOverlay.classList.remove('hidden');
}

if (btnPublishAddon) btnPublishAddon.onclick = async () => {
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

// Open Store Hook
if (btnOpenStore) {
    btnOpenStore.onclick = () => {
        updateStoreButtons();
        renderCommunityAddons(); // Load community ones too
        storeOverlay.classList.remove('hidden');
    };
}

// Initial Sidebar Community Render
setTimeout(renderSidebarCommunityModes, 500);

// Auto Updater Listeners
if (window.electronAPI) {
    window.electronAPI.receive('fromMain', (data) => {
        if (data.type === 'update-available') {
            showToast("🔄 New Update Found! Downloading in background...");
        } else if (data.type === 'update-downloaded') {
            if (confirm("✨ New Update Downloaded! Would you like to restart and install now?")) {
                window.electronAPI.send('toMain', { type: 'window-control', action: 'quit-and-install' });
            }
        }
    });
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

// --- API MODE (OPENROUTER) INTEGRATION --- //
let apiChatHistory = [];

async function fetchOpenRouter(promptText) {
    if (!settings.openRouterKey) {
        showToast("⚠️ API Mode requires an OpenRouter API Key. Please add it in settings.");
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

    const apiKey = (settings.openRouterKey || "").trim();
    if (!apiKey) {
        aiTextContainer.innerHTML = `<span style="color: #ef4444;">❌ API Error: Missing API Key</span>
        <p style="font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">Go to Settings and add your OpenRouter key.</p>`;
        return;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://aura-ai.local",
                "X-Title": "Aura AI Pro",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: apiChatHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            const msg = errorData.error ? errorData.error.message : response.statusText;
            throw new Error(msg);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        apiChatHistory.push({ role: "assistant", content: reply });

        // --- WOW FACTOR: Streaming Simulation ---
        aiContent.querySelector('.typing-dots').style.display = 'none';
        aiTextContainer.innerHTML = "";
        let i = 0;
        const speed = 12; // ms

        function typeEffect() {
            if (i < reply.length) {
                const char = reply.charAt(i);
                aiTextContainer.innerText += char;
                i++;
                container.scrollTop = container.scrollHeight;
                setTimeout(typeEffect, speed);
            } else {
                // Final render with basic markdown
                let formatted = reply
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // bold
                    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:4px; font-family:monospace;">$1</code>'); // code

                aiTextContainer.innerHTML = formatted;

                // Add Copy Button to the bubble
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = "📋";
                copyBtn.title = "Copy this response";
                copyBtn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.8rem; margin-top:8px; align-self:flex-end;";
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(reply);
                    showToast("✅ Response copied!");
                };
                aiContent.appendChild(copyBtn);

                container.scrollTop = container.scrollHeight;
            }
        }
        typeEffect();

    } catch (err) {
        aiTextContainer.innerHTML = `<span style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 5px 10px; border-radius: 8px; display: block;">❌ API Error: ${err.message}</span>
        <p style="font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">Check your OpenRouter API Key in Settings.</p>`;
        console.error("OpenRouter API Error:", err);
    }
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

// --- PRO UTILITIES: AI DEBATE --- //
let isDebating = false;

async function startAIDebate() {
    if (!settings.useApiMode || !settings.openRouterKey) {
        showToast("⚠️ AI Debate requires Pro Mode (API) enabled.");
        return;
    }

    const topic = hubInput.value.trim();
    if (!topic) {
        showToast("⚠️ Enter a topic in the input box first!");
        return;
    }

    isDebating = true;
    showToast("⚔️ Starting AI Debate on: " + topic);

    // Switch to API panel to show progress
    toggleView('api', true);

    let currentContext = topic;

    // Basic loop for 3 rounds
    for (let i = 0; i < 3; i++) {
        if (!isDebating) break;

        // Round 1: AI A
        const promptA = `Topic: ${topic}\nCurrent debate state: ${currentContext}\n\nPlease provide a strong argument/point of view on this topic. Be concise.`;
        await fetchOpenRouter(promptA);

        await new Promise(r => setTimeout(r, 4000));

        // AI B Persona
        const promptB = `You are a critic debating the following point: \n"${currentContext}"\n\nChallenge this point of view with a counter-argument. Be sharp but respectful.`;
        await fetchOpenRouter(promptB);

        await new Promise(r => setTimeout(r, 4000));
    }

    isDebating = false;
    showToast("✅ Debate Finished.");
}

const btnDebate = document.getElementById('btn-ai-debate');
if (btnDebate) btnDebate.onclick = startAIDebate;

// --- WORKFLOW CHAIN --- //
async function startWorkflowChain() {
    if (!settings.useApiMode || !settings.openRouterKey) {
        showToast("⚠️ Workflow Chain requires Pro Mode (API).");
        return;
    }

    const input = hubInput.value.trim();
    if (!input) {
        showToast("⚠️ Please enter initial data to process.");
        return;
    }

    showToast("🔗 Starting Workflow Chain...");
    toggleView('api', true);

    // Step 1: Analyze
    const step1 = `Initial Data: ${input}\n\nTask 1: Analyze the key points and list them.`;
    await fetchOpenRouter(step1);
    await new Promise(r => setTimeout(r, 5000));

    // Step 2: Refine / Transform
    const step2 = `Task 2: Based on the previous analysis, write a formal report summary.`;
    await fetchOpenRouter(step2);

    showToast("✅ Workflow Chain Completed.");
}

const btnChain = document.getElementById('btn-workflow-chain');
if (btnChain) btnChain.onclick = startWorkflowChain;
// --- END PRO UTILITIES --- //
