const { contextBridge, ipcRenderer } = require('electron');

// --- Explanation / 説明 / คำอธิบาย ---
// [EN] Preload Script: A bridge that allows the UI to talk to the system safely.
// [JP] プリロード・スクリプト (Preload Script): UIとシステムを安全に繋ぐ架け橋です。
// [TH] Preload Script: เป็นเหมือนสะพานเชื่อมให้หน้า UI คุยกับระบบเครื่องได้อย่างปลอดภัย

contextBridge.exposeInMainWorld('electronAPI', {
    // We will add IPC (Inter-Process Communication) functions here later
    // 通信 (Tsuushin) - การสื่อสารระหว่างกระบวนการ
    send: (channel, data) => {
        let validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    recognizeText: (dataUrl) => ipcRenderer.invoke('recognize-text', dataUrl),
    
    // Aura-Flow (Autonomous Engine)
    listSkills: () => ipcRenderer.invoke('list-skills'),
    readSkill: (name) => ipcRenderer.invoke('read-skill', name),
    runShellCommand: (cmd) => ipcRenderer.invoke('run-shell-command', cmd),
    openExternal: (url) => ipcRenderer.send('toMain', { type: 'open-url', url: url }),
    downloadEngine: (url) => ipcRenderer.invoke('download-engine', url),

    platform: process.platform,
    isMac: process.platform === 'darwin'
});
