const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, session, clipboard, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Expose app version to the renderer for UI display
ipcMain.handle('get-app-version', () => app.getVersion());

// --- Explanation / 説明 / คำอธิบาย ---
// [EN] The Main Process: This is the brain of the app. It manages system events and windows.
// [JP] メイン・プロセス (Main Process): アプリの心臓部です。システムイベントやウィンドウを管理します。
// [TH] Main Process: คือหัวใจของโปรแกรม ทำหน้าที่จัดการหน้าต่างและเหตุการณ์ต่างๆ ในระบบ

function createWindow() {
    // Create the browser window.
    // ウィンドウを作成する (Window o sakusei suru) - สร้างหน้าต่างโปรแกรม
    const mainWindow = new BrowserWindow({
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
        if (input.control && input.key.toLowerCase() === 'h' && input.type === 'keyDown') {
            event.preventDefault();
            mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'send-prompt' });
        }
        if (input.control && input.key.toLowerCase() === 'g' && input.type === 'keyDown') {
            event.preventDefault();
            mainWindow.webContents.send('fromMain', { type: 'shortcut-triggered', action: 'toggle-sidebar' });
        }
    });
}

// Global Hotkey implementation (Phase 2 preview)
// グローバル・ホットキー (Global Hotkey) - ปุ่มลัดเรียกใช้จากทุกที่
app.whenReady().then(() => {
    createWindow();

    // 🚀 Auto-Updater Logic
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('fromMain', { type: 'update-available' });
    });

    autoUpdater.on('update-not-available', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('fromMain', { type: 'update-not-available' });
    });

    autoUpdater.on('update-downloaded', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('fromMain', { type: 'update-downloaded' });
    });

    autoUpdater.on('error', (err) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('fromMain', { type: 'update-error', message: (err && err.message) ? err.message : String(err) });
    });

    // Register Alt+Space hotkey
    // ショートカットを登録する (Shortcut o touroku suru) - ลงทะเบียนปุ่มลัด
    globalShortcut.register('Alt+Space', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) return;

        if (win.isVisible() && win.isFocused()) {
            win.hide();
        } else {
            win.show();
            win.focus();
        }
    });

    // Window Control Handlers
    // 窓の制御 (Mado no seigyo) - การจัดการหน้าต่าง
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
                    // [EN] Copy to clipboard so user can Ctrl+V into AI
                    // [JP] クリップボードにコピーして、AIに貼り付け可能にする
                    // [TH] ก๊อปเข้า Clipboard เพื่อให้กด Ctrl+V วางใน AI ได้ทันที
                    const img = source.thumbnail;
                    clipboard.writeImage(img);
                    
                    event.reply('fromMain', { type: 'screenshot-captured', data: img.toDataURL() });
                    break;
                }
            });
        }
    });

    // [EN] Fix Database IO errors by clearing stalled sessions on startup
    // [JP] 起動時に停滞したセッションをクリアしてエラーを回避
    // [TH] แก้ไขปัญหา Database IO error โดยการล้างเซสชันที่ตกค้างตอนเริ่มโปรแกรม
    // // session.defaultSession.clearStorageData();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


// Quit when all windows are closed.
// アプリを終了する (App o shuuryou suru) - ปิดโปรแกรมเมื่อปิดหน้าต่างทั้งหมด
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
