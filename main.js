const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, session, clipboard, nativeImage, shell, Menu, Tray } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const http = require('http');
const urlModule = require('url');
const Tesseract = require('tesseract.js');
const ocrMain = require('./ocrMain.js');



// Expose app version to the renderer for UI display
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('recognize-text', async (event, dataUrl) => {
    return await ocrMain.recognize(dataUrl);
});


// --- Explanation / 説明 / คำอธิบาย ---
// [EN] The Main Process: This is the brain of the app. It manages system events and windows.
// [JP] メイン・プロセス (Main Process): アプリの心臓部です。システムイベントやウィンドウを管理します。
// [TH] Main Process: คือหัวใจของโปรแกรม ทำหน้าที่จัดการหน้าต่างและเหตุการณ์ต่างๆ ในระบบ

// --- Deep Link Configuration [Professional Way by Antigravity] ---
// [EN] Register custom protocol 'aura-ai://' for secure external authentication.
// [TH] ลงทะเบียนโปรโตคอล 'aura-ai://' เพื่อรองรับการล็อกอินผ่านเว็บภายนอกครับ
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('aura-ai', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('aura-ai');
}

let mainWindow;
let assistantWindow;
let tray = null;

// Global state for shortcuts (synchronized from renderer)
const isMac = process.platform === 'darwin';
let appShortcuts = {
    enabled: true,
    send: { enabled: true, key: isMac ? 'Cmd+H' : 'Ctrl+H' },
    broadcast: { enabled: true, key: isMac ? 'Cmd+Shift+H' : 'Ctrl+Shift+H' },
    sidebar: { enabled: true, key: isMac ? 'Cmd+G' : 'Ctrl+G' },
    global: { enabled: true, key: isMac ? 'Cmd+F' : 'Alt+Space' },
    lookupper: { enabled: true, key: 'Alt+Q' },
    scanMode: false // Hover Translate
};

let lastMousePos = { x: 0, y: 0 };
let mouseIdleTime = 0;
const SCAN_INTERVAL = 300; // Poll mouse every 300ms
const IDLE_THRESHOLD = 800; // Trigger after 800ms

function matchesShortcut(input, shortcutObj) {
    if (!appShortcuts.enabled || !shortcutObj || !shortcutObj.enabled) return false;
    const shortcutStr = (shortcutObj.key || '')
        .replace(/⌘|Command|Meta/gi, 'Cmd')
        .replace(/⌥|Option|Opt/gi, 'Alt');
    if (!shortcutStr) return false;

    const parts = shortcutStr.toLowerCase().split('+');
    const isMac = process.platform === 'darwin';
    
    // Primary Modifier (Cmd on Mac, Ctrl on Win)
    const isCmdOrCtrl = parts.includes('cmd') || parts.includes('ctrl');
    let primaryMatch = false;
    if (isCmdOrCtrl) {
        primaryMatch = isMac ? input.meta : input.control;
    } else {
        primaryMatch = !input.meta && !input.control;
    }

    let shiftMatch = parts.includes('shift') ? input.shift : !input.shift;
    let altMatch = parts.includes('alt') ? input.alt : !input.alt;

    let key = input.key;
    if (key === 'Unidentified' || !key) {
        if (input.code.startsWith('Digit')) key = input.code.replace('Digit', '');
        else if (input.code.startsWith('Numpad') && input.code.length === 7) key = input.code.replace('Numpad', '');
        else if (input.code) key = input.code;
    }

    const keyMatch = (key || '').toLowerCase() === parts[parts.length - 1];
    
    return primaryMatch && shiftMatch && altMatch && keyMatch;
}

function createWindow() {
    // Create the browser window.
    // ウィンドウを作成する (Window o sakusei suru) - สร้างหน้าต่างโปรแกรม
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a1a', // Dark theme for premium feel
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true, // Required to use <webview> tags for Phase 1
            nodeIntegration: false, // Security best practice
            contextIsolation: true  // Security best practice
        },
        frame: false, // Custom Title Bar Phase
        title: "Aura AI | Professional Workspace"
    });

    // Load the index.html of the app.
    // HTMLを読み込む (HTML o yomikomu) - โหลดไฟล์หน้าจอหลัก
    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        if (assistantWindow && !assistantWindow.isDestroyed()) {
            assistantWindow.destroy();
            assistantWindow = null;
        }
    });

    // Handle Global Shortcuts inside the window (even with Webview focus)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;

        if (matchesShortcut(input, appShortcuts.send)) {
            event.preventDefault();
            mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'send-prompt' });
        } else if (matchesShortcut(input, appShortcuts.sidebar)) {
            event.preventDefault();
            mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'toggle-sidebar' });
        } else if (matchesShortcut(input, appShortcuts.broadcast)) {
            event.preventDefault();
            mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'broadcast-prompt' });
        } else {
            // Check P1-P5
            for (let i = 1; i <= 5; i++) {
                if (matchesShortcut(input, appShortcuts[`p${i}`])) {
                    event.preventDefault();
                    mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: `prompt-${i}` });
                    break;
                }
            }
        }
    });
}

function createAssistantWindow() {
    assistantWindow = new BrowserWindow({
        width: 350,
        height: 450,
        backgroundColor: '#1a1a1a',
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    assistantWindow.loadFile('assistant.html');
    
    assistantWindow.on('hide', () => { 
        if (assistantWindow) assistantWindow.webContents.send('fromMain', { type: 'assistant-clear' }); 
    });
}

// Global Hotkey implementation
function registerGlobalHotkey() {
    globalShortcut.unregisterAll();
    
    if (appShortcuts.enabled && appShortcuts.global && appShortcuts.global.enabled) {
        const key = appShortcuts.global.key || 'Alt+Space';
        try {
            globalShortcut.register(key, () => {
                if (!mainWindow) return;
                if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
                else { mainWindow.show(); mainWindow.focus(); }
            });
            console.log(`Main Process: Global hotkey registered: ${key}`);
        } catch (e) {
            console.error(`Main Process: Failed to register hotkey ${key}`, e);
        }
    }
    // Register Lookupper Shortcut
    if (appShortcuts.enabled && appShortcuts.lookupper && appShortcuts.lookupper.enabled) {
        const lookKeys = [appShortcuts.lookupper.key || 'Alt+Q', 'Alt+L']; // Add Alt+L as fallback
        lookKeys.forEach(k => {
            try {
                globalShortcut.register(k, () => {
                    console.log(`Main Process: Global Hotkey ${k} triggered!`);
                    if (mainWindow) {
                        mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'lookupper' });
                    }
                });
                const isReg = globalShortcut.isRegistered(k);
                console.log(`Main Process: Lookupper hotkey registered: ${k} (Status: ${isReg ? 'SUCCESS' : 'FAILED'})`);
            } catch (e) {
                console.error(`Main Process: Failed to register Lookupper hotkey ${k}`, e);
            }
        });
    }
}

// Single Instance Lock for Deep Linking
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            
            // Handle Deep Link for Windows
            const url = commandLine.pop();
            if (url && url.startsWith('aura-ai://')) {
                mainWindow.webContents.send('fromMain', { type: 'deep-link', url: url });
            }
        }
    });

    app.whenReady().then(() => {
        // [EN] Global User-Agent Spoofing: Use a modern Chrome UA to allow Google Sign-In on all sites.
        // [TH] ปลอมแปลง User-Agent ทั้งระบบเพื่อให้ Google มั่นใจและยอมให้ล็อกอินในทุกเว็บครับ
        
        const isMac = process.platform === 'darwin';
        const chromeUA = isMac 
            ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

        session.defaultSession.setUserAgent(chromeUA);
        
        createWindow();
        createAssistantWindow();
        createTray();
        registerGlobalHotkey();
        startMousePolling();

        // [EN] Universal Webview Popup Handler: Ensures all webviews (hardcoded & dynamic)
        // can open external links in the system browser.
        app.on('web-contents-created', (e, contents) => {
            if (contents.getType() === 'webview') {
                contents.setWindowOpenHandler(({ url }) => {
                    if (url.includes('accounts.google.com') || url.includes('appleid.apple.com') || url.includes('microsoft.com') || url.includes('auth')) {
                        return { action: 'allow' };
                    }
                    shell.openExternal(url);
                    return { action: 'deny' };
                });
            }
        });
        
        // ... (rest of the file)
        autoUpdater.checkForUpdatesAndNotify();
        
        autoUpdater.on('update-available', () => {
            if (mainWindow) mainWindow.webContents.send('fromMain', { type: 'update-available' });
        });

        autoUpdater.on('update-not-available', () => {
            if (mainWindow) mainWindow.webContents.send('fromMain', { type: 'update-not-available' });
        });

        autoUpdater.on('update-downloaded', () => {
            if (mainWindow) mainWindow.webContents.send('fromMain', { type: 'update-downloaded' });
        });

        autoUpdater.on('error', (err) => {
            if (mainWindow) mainWindow.webContents.send('fromMain', { type: 'update-error', message: (err && err.message) ? err.message : String(err) });
        });

        // Window Control Handlers
        ipcMain.on('toMain', (event, arg) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (arg.type === 'set-always-on-top') {
                win.setAlwaysOnTop(arg.value);
            } else if (arg.type === 'window-control') {
                if (arg.action === 'minimize') win.minimize();
                else if (arg.action === 'maximize') {
                    if (win.isMaximized()) win.unmaximize();
                    else win.maximize();
                }
                else if (arg.action === 'close') win.close();
                else if (arg.action === 'quit-and-install') autoUpdater.quitAndInstall();
            } else if (arg.type === 'check-for-updates') {
                autoUpdater.checkForUpdatesAndNotify();
                if (win) win.webContents.send('fromMain', { type: 'checking-updates' });
            } else if (arg.type === 'set-opacity') {
                win.setOpacity(arg.value);
            } else if (arg.type === 'capture-screen') {
                desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } }).then(async sources => {
                    for (const source of sources) {
                        const img = source.thumbnail;
                        clipboard.writeImage(img);
                        event.reply('fromMain', { type: 'screenshot-captured', data: img.toDataURL() });
                        break;
                    }
                });
            } else if (arg.type === 'lookupper-capture') {
                console.log("Main Process: Received 'lookupper-capture' request from Renderer.");
                triggerCapture();
            } else if (arg.type === 'update-addon-status') {
                // [EN] Update Tray when add-on status changes
                // [TH] อัปเดต Tray เมื่อสถานะ Add-on เปลี่ยน
                createTray(arg.addons);
            } else if (arg.type === 'update-shortcuts') {
                appShortcuts = arg.shortcuts;
                registerGlobalHotkey();
            } else if (arg.type === 'update-translate-active') {
                if (!appShortcuts.lookupper) appShortcuts.lookupper = { enabled: true, key: 'Alt+Q' };
                appShortcuts.lookupper.enabled = arg.value;
                registerGlobalHotkey();
                console.log(`Main Process: Translate Overlay active set to ${arg.value}`);
            } else if (arg.type === 'update-scan-mode') {
                appShortcuts.scanMode = arg.value;
                console.log(`Main Process: Scan Mode set to ${arg.value}`);
            } else if (arg.type === 'open-external-url') {
                shell.openExternal(arg.url);
            } else if (arg.type === 'assistant-show') {
                 if (assistantWindow) {
                     assistantWindow.setPosition(Math.round(arg.x), Math.round(arg.y));
                     assistantWindow.show();
                     if (arg.data) {
                         assistantWindow.webContents.send('fromMain', { type: 'assistant-update', ...arg });
                     }
                 }
            } else if (arg.type === 'assistant-hide') {
                if (assistantWindow) assistantWindow.hide();
            } else if (arg.type === 'assistant-update') {
                if (assistantWindow) assistantWindow.webContents.send('fromMain', arg);
            } else if (arg.type === 'assistant-action') {
                // Relay action from assistant to main window (e.g., Notion save, Open Settings)
                if (mainWindow) {
                    if (arg.action === 'settings') {
                        mainWindow.show();
                        mainWindow.focus();
                        mainWindow.webContents.send('fromMain', { type: 'open-settings' });
                    } else {
                        mainWindow.webContents.send('fromMain', { type: 'assistant-action', ...arg });
                    }
                }
            } else if (arg.type === 'start-auth-server') {
                // --- Temporary Auth Server [Professional Loopback Way] ---
                // Avoid multiple instances on the same port
                if (global.authServerInstance) {
                    try { global.authServerInstance.close(); } catch (e) {}
                    global.authServerInstance = null;
                }

                const authServer = http.createServer((req, res) => {
                    const parsedUrl = urlModule.parse(req.url, true);
                    const idToken = parsedUrl.query.id_token || parsedUrl.query.code;

                    if (idToken) {
                        event.reply('fromMain', { type: 'auth-success', idToken: idToken });
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>Success!</h1><p>You can now close this tab and return to Aura AI.</p><script>window.close();</script>');
                        authServer.close();
                        global.authServerInstance = null;
                    } else {
                        // Sometimes token is in hash, need client-side redirect
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<script>if(window.location.hash){window.location.href="/?"+window.location.hash.substring(1)}else{document.write("Waiting for login...")}</script>');
                    }
                });

                authServer.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.error("Port 3000 in use, retrying after potential cleanup...");
                    }
                });

                authServer.listen(3000, '127.0.0.1', () => {
                    console.log("Auth Server listening on 127.0.0.1:3000");
                    global.authServerInstance = authServer;
                });

                // Auto-close server after 5 minutes to prevent leak
                setTimeout(() => {
                    if (global.authServerInstance === authServer) {
                        authServer.close();
                        global.authServerInstance = null;
                    }
                }, 5 * 60 * 1000);
            } else if (arg.type === 'ollama-install') {
                const { spawn } = require('child_process');
                console.log("Main Process: Starting Ollama pull for llama3.2...");
                
                // [Professional Note] Pulling llama3.2 automatically for the user
                const pull = spawn('ollama', ['pull', 'llama3.2']);
                
                pull.stdout.on('data', (data) => {
                    const str = data.toString();
                    const match = str.match(/(\d+)%/);
                    if (match) {
                        event.reply('fromMain', { type: 'ollama-progress', percent: parseInt(match[1]) });
                    }
                });

                pull.stderr.on('data', (data) => {
                    const str = data.toString().toLowerCase();
                    if (str.includes('error') || str.includes('not found')) {
                        event.reply('fromMain', { type: 'ollama-error', message: data.toString() });
                    }
                });

                pull.on('close', (code) => {
                    if (code === 0) {
                        console.log("Main Process: Ollama pull completed successfully.");
                        event.reply('fromMain', { type: 'ollama-success' });
                    } else {
                        event.reply('fromMain', { type: 'ollama-error', message: `Exit code ${code}` });
                    }
                });
            }
        });

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // Initialize OCR Engine (Main Process)
        ocrMain.initOcr().catch(e => console.error("OCR Engine Init Error:", e));
    });
}

function createTray(addonStatus = {}) {
    if (tray) tray.destroy();
    
    const iconPath = path.join(__dirname, 'assets', 'icon.png'); // Ensure this exists
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    tray = new Tray(icon || nativeImage.createEmpty());
    tray.setToolTip('Aura AI Pro');

    const isTranslateActive = addonStatus.translateOverlay?.enabled || appShortcuts.lookupper.enabled;
    const isLocalAIActive = addonStatus.localAI?.enabled;

    const contextMenu = Menu.buildFromTemplate([
        { label: '🧠 Aura AI Pro v1.3', enabled: false },
        { type: 'separator' },
        { label: '🏠 Main Dashboard', click: () => { mainWindow.show(); mainWindow.focus(); } },
        { type: 'separator' },
        { label: `🌐 Translate: ${isTranslateActive ? '🟢 Enabled' : '⚪ Disabled'}`, click: () => {
             mainWindow.webContents.send('fromMain', { type: 'toggle-addon-sidebar', id: 'translateOverlay' });
        }},
        { label: `🤖 Local AI: ${isLocalAIActive ? '🟢 Active' : '⚪ Idle'}`, enabled: false },
        { type: 'separator' },
        { label: '⚙️ Settings', click: () => { mainWindow.show(); mainWindow.webContents.send('fromMain', { type: 'open-settings' }); } },
        { label: '❌ Quit Aura AI', click: () => { app.isQuitting = true; app.quit(); } }
    ]);

    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// Handle Deep Link for macOS
app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
        mainWindow.webContents.send('fromMain', { type: 'deep-link', url: url });
    } else {
        // If window not ready, store it or just wait
        app.whenReady().then(() => {
            if (mainWindow) mainWindow.webContents.send('fromMain', { type: 'deep-link', url: url });
        });
    }
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
// [EN] Mouse Polling for Scan Mode (Hover Translate)
// [TH] ตัวช่วยตรวจจับเมาส์นิ่งเพื่อเริ่มแปลอัตโนมัติ (Scan Mode)
function startMousePolling() {
    const { screen } = require('electron');
    
    setInterval(() => {
        if (!appShortcuts.scanMode) {
            mouseIdleTime = 0;
            return;
        }

        const currentPos = screen.getCursorScreenPoint();
        
        // Check if mouse moved
        const dist = Math.sqrt(Math.pow(currentPos.x - lastMousePos.x, 2) + Math.pow(currentPos.y - lastMousePos.y, 2));
        
        if (dist < 5) { // Mouse is relatively still
            mouseIdleTime += SCAN_INTERVAL;
            if (mouseIdleTime === IDLE_THRESHOLD) {
                 // Trigger capture!
                 console.log("Main Process: Auto-Scan triggered (Mouse Idle)");
                 triggerAutoCapture(currentPos);
            }
        } else {
            mouseIdleTime = 0;
            // If mouse moves, hide assistant if it was showing? (Optional)
            // if (assistantWindow && assistantWindow.isVisible()) assistantWindow.hide();
        }
        
        lastMousePos = currentPos;
    }, SCAN_INTERVAL);
}

function triggerAutoCapture(point) {
    if (!mainWindow) return;
    
    const { screen } = require('electron');
    const display = screen.getDisplayNearestPoint(point);
    const scaleFactor = display.scaleFactor;
    
    const logicalWidth = 300;
    const logicalHeight = 100;
    const logicalX = Math.round(point.x - logicalWidth / 2);
    const logicalY = Math.round(point.y - logicalHeight / 2);
    
    const physicalX = Math.round(logicalX * scaleFactor);
    const physicalY = Math.round(logicalY * scaleFactor);
    const physicalWidth = Math.round(logicalWidth * scaleFactor);
    const physicalHeight = Math.round(logicalHeight * scaleFactor);
    
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: display.size }).then(sources => {
        const source = sources.find(s => s.display_id === display.id.toString()) || 
                       sources.find(s => s.name === "Entire screen") ||
                       sources[0];
        if (!source) return;
        
        const img = source.thumbnail;
        const cropped = img.crop({
            x: physicalX,
            y: physicalY,
            width: physicalWidth,
            height: physicalHeight
        });
        
        mainWindow.webContents.send('fromMain', { 
            type: 'lookupper-captured', 
            data: cropped.toDataURL(), 
            x: point.x, 
            y: point.y,
            scaleFactor: scaleFactor,
            isAuto: true
        });
    });
}

function triggerCapture() {
    if (!mainWindow) return;
    
    const { screen } = require('electron');
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const scaleFactor = display.scaleFactor;
    
    const logicalWidth = 300;
    const logicalHeight = 100;
    const logicalX = Math.round(point.x - logicalWidth / 2);
    const logicalY = Math.round(point.y - logicalHeight / 2);
    
    const physicalX = Math.round(logicalX * scaleFactor);
    const physicalY = Math.round(logicalY * scaleFactor);
    const physicalWidth = Math.round(logicalWidth * scaleFactor);
    const physicalHeight = Math.round(logicalHeight * scaleFactor);
    
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: display.size }).then(sources => {
        const source = sources.find(s => s.display_id === display.id.toString()) || 
                       sources.find(s => s.name === "Entire screen") ||
                       sources[0];
        if (!source) return;
        
        const img = source.thumbnail;
        const cropped = img.crop({
            x: physicalX,
            y: physicalY,
            width: physicalWidth,
            height: physicalHeight
        });
        
        mainWindow.webContents.send('fromMain', { 
            type: 'lookupper-captured', 
            data: cropped.toDataURL(), 
            x: point.x, 
            y: point.y,
            scaleFactor: scaleFactor,
            isAuto: false
        });
    });
}
