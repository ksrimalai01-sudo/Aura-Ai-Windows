const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, session, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const http = require('http');
const urlModule = require('url');

// Expose app version to the renderer for UI display
ipcMain.handle('get-app-version', () => app.getVersion());

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

// Global state for shortcuts (synchronized from renderer)
const isMac = process.platform === 'darwin';
let appShortcuts = {
    enabled: true,
    send: { enabled: true, key: isMac ? 'Cmd+H' : 'Ctrl+H' },
    broadcast: { enabled: true, key: isMac ? 'Cmd+Shift+H' : 'Ctrl+Shift+H' },
    sidebar: { enabled: true, key: isMac ? 'Cmd+G' : 'Ctrl+G' },
    global: { enabled: true, key: isMac ? 'Cmd+F' : 'Alt+Space' }
};

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
        const chromeUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        session.defaultSession.setUserAgent(chromeUA);
        
        createWindow();
        registerGlobalHotkey();
        
        // 🚀 Auto-Updater Logic
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
            } else if (arg.type === 'update-shortcuts') {
                appShortcuts = arg.shortcuts;
                registerGlobalHotkey();
            } else if (arg.type === 'open-external-url') {
                shell.openExternal(arg.url);
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
            }
        });

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
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
