import { contextBridge, ipcRenderer } from 'electron';

// 렌더러 프로세스에 노출할 Electron 브릿지 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window:maximized-change', handler);
    return () => {
      ipcRenderer.removeListener('window:maximized-change', handler);
    };
  },
  closeWindow: () => ipcRenderer.invoke('window:close'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getStorage: () => ipcRenderer.invoke('storage:get'),
  setStorage: (data: Record<string, unknown>) => ipcRenderer.invoke('storage:set', data),
  clearTokens: () => ipcRenderer.invoke('storage:clearTokens'),
  loginSpotify: (params: {
    target: 'src' | 'dst';
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    switchAccount?: boolean;
    openMode?: 'default_browser' | 'copy_only';
  }) => ipcRenderer.invoke('auth:login', params),
  cancelLogin: () => ipcRenderer.invoke('auth:cancelLogin'),
  getAuthorizeUrl: (params: { clientId: string; redirectUri?: string }) =>
    ipcRenderer.invoke('auth:getAuthorizeUrl', params),
  refreshSpotifyToken: (params: {
    target: 'src' | 'dst';
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }) => ipcRenderer.invoke('auth:refresh', params),
  saveBackupFile: (params: {
    defaultName: string;
    content: string;
    format: 'json' | 'csv';
  }) => ipcRenderer.invoke('backup:saveFile', params),
  openBackupFile: () => ipcRenderer.invoke('backup:openFile'),
  getBackupsDirectory: () => ipcRenderer.invoke('backup:getDirectory'),
  listAppBackups: () => ipcRenderer.invoke('backup:list'),
  saveAppBackup: (params: { filename?: string; content: string }) =>
    ipcRenderer.invoke('backup:saveAppBackup', params),
  loadAppBackup: (filenameOrPath: string) =>
    ipcRenderer.invoke('backup:loadAppBackup', filenameOrPath),
  openBackupsFolder: () => ipcRenderer.invoke('backup:openDirectory'),
  getAppVersion: () => ipcRenderer.invoke('update:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadAndInstallUpdate: (params: {
    downloadUrl: string;
    assetName?: string | null;
    latestVersion?: string;
  }) => ipcRenderer.invoke('update:downloadAndInstall', params),
  cancelUpdateDownload: () => ipcRenderer.invoke('update:cancel'),
  onUpdateProgress: (
    callback: (progress: { percent: number; transferred: number; total: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: { percent: number; transferred: number; total: number }
    ) => callback(progress);
    ipcRenderer.on('update:progress', handler);
    return () => {
      ipcRenderer.removeListener('update:progress', handler);
    };
  },
});
