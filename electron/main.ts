import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, net } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

// Windows 작업표시줄 및 바로가기 아이콘 그룹화를 위한 AppUserModelId 설정
if (process.platform === 'win32') {
  app.setAppUserModelId('cc.xitora.migratify');
}

// 사용자 설정 및 토큰 저장 파일 경로 반환 함수
function getStorePath(): string {
  return path.join(app.getPath('userData'), 'spotify-migrator-store.json');
}

// 로컬 저장소 데이터 읽기 함수
function readStore(): Record<string, unknown> {
  try {
    const storePath = getStorePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const raw = fs.readFileSync(storePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    console.error('설정 파일 읽기 오류:', error);
    return {};
  }
}

// 로컬 저장소 데이터 쓰기 함수
function writeStore(data: Record<string, unknown>): boolean {
  try {
    const storePath = getStorePath();
    const current = readStore();
    const merged = { ...current, ...data };
    fs.writeFileSync(storePath, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('설정 파일 저장 오류:', error);
    return false;
  }
}

// 설치된 앱의 하위 backups 디렉토리 경로 반환 및 생성
function getAppBackupsDir(): string {
  let baseDir: string;
  if (app.isPackaged) {
    baseDir = path.dirname(app.getPath('exe'));
  } else {
    baseDir = process.cwd();
  }
  const backupsDir = path.join(baseDir, 'backups');
  try {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const testFile = path.join(backupsDir, '.write_test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return backupsDir;
  } catch {
    const fallbackDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

let mainWindow: BrowserWindow | null = null;
let activeAuthServer: http.Server | null = null;
let activeAuthCancel: (() => void) | null = null;

// 실행 중인 로컬 OAuth 콜백 서버 정리 함수
function closeActiveAuthServer(): void {
  try {
    if (activeAuthServer) {
      if (typeof (activeAuthServer as any).closeAllConnections === 'function') {
        (activeAuthServer as any).closeAllConnections();
      }
      activeAuthServer.close();
      activeAuthServer = null;
    }
  } catch (error) {
    console.error('콜백 서버 종료 오류:', error);
  }
}

// 윈도우 애플리케이션 아이콘 경로 탐색 함수 (실제 파일시스템의 .ico 우선)
function getAppIconPath(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// 메인 애플리케이션 윈도우 생성 함수
function createMainWindow(): void {
  try {
    const iconPath = getAppIconPath();
    const appIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

    mainWindow = new BrowserWindow({
      width: 1260,
      height: 840,
      minWidth: 1024,
      minHeight: 720,
      frame: false,
      backgroundColor: '#212229',
      show: false,
      icon: appIcon && !appIcon.isEmpty() ? appIcon : iconPath,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (appIcon && !appIcon.isEmpty()) {
      mainWindow.setIcon(appIcon);
    }

    const isDevServer = process.argv.includes('--dev');
    if (isDevServer) {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        if (mainWindow) {
          mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
      });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    // 창 최대화 및 이전 크기 복원 이벤트 브로드캐스트
    mainWindow.on('maximize', () => {
      mainWindow?.webContents.send('window:maximized-change', true);
    });

    mainWindow.on('unmaximize', () => {
      mainWindow?.webContents.send('window:maximized-change', false);
    });

    mainWindow.on('closed', () => {
      closeActiveAuthServer();
      mainWindow = null;
    });
  } catch (error) {
    console.error('메인 윈도우 생성 실패:', error);
  }
}

// Spotify 인증 코드를 액세스 토큰으로 교환하는 함수
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<Record<string, unknown>> {
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const errDesc =
        (data.error_description as string) ||
        (data.error as string) ||
        '토큰 발급 실패';
      throw new Error(errDesc);
    }

    return {
      ...data,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    };
  } catch (error) {
    throw error;
  }
}

// 리프레시 토큰으로 액세스 토큰 갱신 함수
async function refreshSpotifyToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<Record<string, unknown>> {
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const errDesc =
        (data.error_description as string) ||
        (data.error as string) ||
        '토큰 갱신 실패';
      throw new Error(errDesc);
    }

    return {
      ...data,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    };
  } catch (error) {
    throw error;
  }
}

// 브라우저 계정 전환(로그아웃 후 로그인 화면 이동) HTML 생성 함수
function buildSwitchSessionHtml(authorizeUrl: string, targetLabel: string): string {
  const safeUrl = JSON.stringify(authorizeUrl);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>Spotify 계정 전환 중...</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif;
    }
    .card {
      width: 420px;
      padding: 32px;
      border-radius: 12px;
      background: #121215;
      border: 1px solid #27272a;
      text-align: center;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 2.5px solid #27272a;
      border-top-color: #1db954;
      border-radius: 50%;
      margin: 0 auto 16px;
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 16px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 13px; color: #a1a1aa; margin: 0; line-height: 1.5; }
    iframe { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>${targetLabel} 로그인 화면으로 준비 중입니다</h2>
    <p>브라우저에 남아 있던 이전 Spotify 세션을 정리하고 있습니다.<br/>잠시 후 저장된 ID/PW 자동완성이 지원되는 로그인 창으로 이동합니다.</p>
  </div>
  <iframe src="https://accounts.spotify.com/logout"></iframe>
  <script>
    setTimeout(function() {
      window.location.replace(${safeUrl});
    }, 950);
  </script>
</body>
</html>`;
}

// 브라우저 인증 완료 안내 HTML 생성 함수
function buildCallbackResultHtml(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>Spotify 인증 ${success ? '완료' : '오류'}</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif;
    }
    .card {
      width: 420px;
      padding: 32px;
      border-radius: 12px;
      background: #121215;
      border: 1px solid #27272a;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      background: ${success ? 'rgba(29, 185, 84, 0.15)' : 'rgba(244, 63, 94, 0.15)'};
      color: ${success ? '#1db954' : '#f43f5e'};
    }
    h2 { font-size: 17px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 13px; color: #a1a1aa; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${success ? '연결 성공' : '인증 실패'}</span>
    <h2>${success ? 'Spotify 계정 연결이 완료되었습니다' : '인증을 완료하지 못했습니다'}</h2>
    <p>${message}</p>
    ${
      success
        ? `<p id="countdown" style="margin-top: 14px; color: #a1a1aa; font-size: 13px;">
            <strong id="timer" style="color: #c6a0f6; font-size: 15px;">5</strong>초 후 페이지가 자동으로 닫힙니다.
          </p>
          <button onclick="window.close()" style="margin-top: 14px; padding: 7px 16px; border-radius: 8px; border: 1px solid #363949; background: #272934; color: #cad3f5; font-size: 12px; font-weight: 600; cursor: pointer;">
            지금 창 닫기
          </button>`
        : ''
    }
  </div>
  ${
    success
      ? `<script>
    var remaining = 5;
    var timerEl = document.getElementById('timer');
    var interval = setInterval(function() {
      remaining -= 1;
      if (timerEl) timerEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        window.close();
      }
    }, 1000);
  </script>`
      : ''
  }
</body>
</html>`;
}

// IPC 이벤트 핸들러 등록 함수
function registerIpcHandlers(): void {
  ipcMain.handle('window:minimize', () => {
    try {
      mainWindow?.minimize();
    } catch (error) {
      console.error(error);
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    try {
      return mainWindow ? mainWindow.isMaximized() : false;
    } catch (error) {
      console.error(error);
      return false;
    }
  });

  ipcMain.handle('window:maximize', () => {
    try {
      if (!mainWindow) return false;
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return false;
      } else {
        mainWindow.maximize();
        return true;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  });

  ipcMain.handle('window:close', () => {
    try {
      mainWindow?.close();
    } catch (error) {
      console.error(error);
    }
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        await shell.openExternal(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('외부 링크 열기 오류:', error);
      return false;
    }
  });

  ipcMain.handle('storage:get', () => {
    return readStore();
  });

  ipcMain.handle('storage:set', (_event, data: Record<string, unknown>) => {
    return writeStore(data);
  });

  ipcMain.handle('storage:clearTokens', () => {
    return writeStore({ srcToken: null, dstToken: null });
  });

  // 진행 중인 로그인 대기 취소 핸들러
  ipcMain.handle('auth:cancelLogin', () => {
    if (activeAuthCancel) {
      activeAuthCancel();
      activeAuthCancel = null;
    }
    closeActiveAuthServer();
    return true;
  });

  // 기본 브라우저(자동완성·캡차 프리) + 로컬 콜백 서버 + 계정 전환 모드를 지원하는 OAuth 핸들러
  ipcMain.handle(
    'auth:login',
    async (
      _event,
      params: {
        target: 'src' | 'dst';
        clientId: string;
        clientSecret: string;
        redirectUri?: string;
        switchAccount?: boolean;
        openMode?: 'default_browser' | 'copy_only';
      }
    ) => {
      const redirectUri = params.redirectUri || 'http://127.0.0.1:8888/callback';
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-private',
        'playlist-modify-public',
        'user-follow-read',
        'user-follow-modify',
      ].join(' ');

      const authParams = new URLSearchParams({
        client_id: params.clientId.trim(),
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes,
        // 항상 계정 확인 및 전환("회원님이 아닌가요?") 버튼이 노출되도록 강제
        show_dialog: 'true',
      });
      const authorizeUrl = `https://accounts.spotify.com/authorize?${authParams.toString()}`;

      // 이전 대기 서버가 있으면 정리
      if (activeAuthCancel) {
        activeAuthCancel();
        activeAuthCancel = null;
      }
      closeActiveAuthServer();

      return new Promise((resolve) => {
        let isResolved = false;

        const finishAuth = (result: {
          success: boolean;
          tokenInfo?: Record<string, unknown>;
          error?: string;
          authorizeUrl?: string;
        }): void => {
          if (isResolved) return;
          isResolved = true;
          activeAuthCancel = null;
          closeActiveAuthServer();
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          }
          resolve(result);
        };

        activeAuthCancel = () => {
          finishAuth({
            success: false,
            error: '사용자가 로그인 대기를 취소했습니다.',
          });
        };

        const server = http.createServer(async (req, res) => {
          try {
            const reqUrl = new URL(req.url || '/', 'http://127.0.0.1:8888');

            // 1. 브라우저 세션 전환(기존 로그인된 계정 로그아웃 후 OAuth 진입) 엔드포인트
            if (reqUrl.pathname === '/switch-session') {
              const targetLabel =
                params.target === 'src'
                  ? '기존 계정 (Source)'
                  : '새 계정 (Destination)';
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(buildSwitchSessionHtml(authorizeUrl, targetLabel));
              return;
            }

            // 2. OAuth 콜백 수신 엔드포인트
            if (reqUrl.pathname === '/callback') {
              const code = reqUrl.searchParams.get('code');
              const errorParam = reqUrl.searchParams.get('error');

              if (errorParam || !code) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(
                  buildCallbackResultHtml(
                    false,
                    `인증이 거부되었거나 코드가 없습니다 (${errorParam || 'no_code'}).`
                  )
                );
                finishAuth({
                  success: false,
                  error: `Spotify 인증이 취소되었습니다 (${errorParam || '코드 없음'})`,
                });
                return;
              }

              try {
                const tokenInfo = await exchangeCodeForToken(
                  code,
                  params.clientId.trim(),
                  params.clientSecret.trim(),
                  redirectUri
                );

                const key = params.target === 'src' ? 'srcToken' : 'dstToken';
                writeStore({
                  clientId: params.clientId.trim(),
                  clientSecret: params.clientSecret.trim(),
                  [key]: tokenInfo,
                });

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(
                  buildCallbackResultHtml(
                    true,
                    '이제 이 브라우저 탭을 닫고 Migratify 앱으로 돌아가 주세요.'
                  )
                );

                finishAuth({
                  success: true,
                  tokenInfo,
                });
              } catch (tokenErr) {
                const errMsg =
                  tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(buildCallbackResultHtml(false, errMsg));
                finishAuth({
                  success: false,
                  error: errMsg,
                });
              }
              return;
            }

            res.writeHead(404);
            res.end();
          } catch (srvErr) {
            const msg = srvErr instanceof Error ? srvErr.message : String(srvErr);
            finishAuth({ success: false, error: msg });
          }
        });

        activeAuthServer = server;

        server.on('error', (err) => {
          finishAuth({
            success: false,
            error: `로컬 콜백 서버(127.0.0.1:8888) 실행 오류: ${err.message}`,
          });
        });

        server.listen(8888, '127.0.0.1', () => {
          // 사용자가 직접 시크릿 창이나 다른 프로필에 붙여넣는 모드가 아닐 경우 기본 브라우저 즉시 실행
          // show_dialog: 'true'가 지정되어 있으므로 스포티파이 공식 인증 창에서 계정 전환/선택이 바로 제공됩니다.
          if (params.openMode !== 'copy_only') {
            shell.openExternal(authorizeUrl);
          }
        });
      });
    }
  );

  // 브라우저 수동 붙여넣기용 OAuth 인증 URL 생성 핸들러
  ipcMain.handle(
    'auth:getAuthorizeUrl',
    (
      _event,
      params: {
        clientId: string;
        redirectUri?: string;
      }
    ) => {
      const redirectUri = params.redirectUri || 'http://127.0.0.1:8888/callback';
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-private',
        'playlist-modify-public',
        'user-follow-read',
        'user-follow-modify',
      ].join(' ');
      const authParams = new URLSearchParams({
        client_id: params.clientId.trim(),
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes,
        show_dialog: 'true',
      });
      return `https://accounts.spotify.com/authorize?${authParams.toString()}`;
    }
  );

  ipcMain.handle(
    'auth:refresh',
    async (
      _event,
      params: {
        target: 'src' | 'dst';
        refreshToken: string;
        clientId: string;
        clientSecret: string;
      }
    ) => {
      try {
        const tokenInfo = await refreshSpotifyToken(
          params.refreshToken,
          params.clientId,
          params.clientSecret
        );
        const key = params.target === 'src' ? 'srcToken' : 'dstToken';
        writeStore({ [key]: tokenInfo });
        return { success: true, tokenInfo };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    }
  );

  ipcMain.handle(
    'backup:saveFile',
    async (
      _event,
      params: {
        defaultName: string;
        content: string;
        format: 'json' | 'csv';
      }
    ) => {
      try {
        const filters =
          params.format === 'json'
            ? [{ name: 'Spotify Backup JSON', extensions: ['json'] }]
            : [{ name: 'CSV Spreadsheet', extensions: ['csv'] }];

        const result = await dialog.showSaveDialog(mainWindow!, {
          title: '라이브러리 백업 파일 저장',
          defaultPath: params.defaultName,
          filters,
        });

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }

        const dataToWrite =
          params.format === 'csv' ? '\uFEFF' + params.content : params.content;
        fs.writeFileSync(result.filePath, dataToWrite, 'utf-8');
        return { success: true, filePath: result.filePath };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    }
  );

  ipcMain.handle('backup:openFile', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Spotify 백업 JSON 파일 불러오기',
        properties: ['openFile'],
        filters: [{ name: 'Spotify Backup JSON', extensions: ['json'] }],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        success: true,
        filePath: result.filePaths[0],
        data: parsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  });

  // 앱 하위 backups 디렉토리 경로 반환
  ipcMain.handle('backup:getDirectory', async () => {
    return getAppBackupsDir();
  });

  // 앱 하위 backups 디렉토리 내의 백업 파일 목록 조회 및 요약 메타데이터 파싱
  ipcMain.handle('backup:list', async () => {
    try {
      const dir = getAppBackupsDir();
      if (!fs.existsSync(dir)) return [];
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith('.json'));
      const summaries: Array<Record<string, unknown>> = [];
      for (const f of files) {
        try {
          const fullPath = path.join(dir, f);
          const stat = fs.statSync(fullPath);
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const json = JSON.parse(raw);
          summaries.push({
            filename: f,
            fullPath,
            sizeBytes: stat.size,
            createdAt:
              json.exportedAt ||
              stat.birthtime.toISOString() ||
              stat.mtime.toISOString(),
            sourceUserName: json.sourceUser?.display_name,
            sourceUserId: json.sourceUser?.id,
            sourceUserImage: json.sourceUser?.images?.[0]?.url,
            playlistsCount: Array.isArray(json.playlists)
              ? json.playlists.length
              : 0,
            likedTracksCount: Array.isArray(json.likedTracks)
              ? json.likedTracks.length
              : 0,
            savedAlbumsCount: Array.isArray(json.savedAlbums)
              ? json.savedAlbums.length
              : 0,
            followedArtistsCount: Array.isArray(json.followedArtists)
              ? json.followedArtists.length
              : 0,
            savedShowsCount: Array.isArray(json.savedShows)
              ? json.savedShows.length
              : 0,
          });
        } catch (err) {
          console.error(`백업 파일(${f}) 파싱 실패:`, err);
        }
      }
      summaries.sort(
        (a, b) =>
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime()
      );
      return summaries;
    } catch (error) {
      console.error('백업 목록 조회 실패:', error);
      return [];
    }
  });

  // 앱 하위 backups 디렉토리에 백업 파일 저장
  ipcMain.handle(
    'backup:saveAppBackup',
    async (_event, params: { filename?: string; content: string }) => {
      try {
        const dir = getAppBackupsDir();
        const now = new Date();
        const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const defaultFilename = `Migratify-Backup-${yyyymmdd}-${hhmmss}.json`;
        // 경로 순회(Path Traversal) 방지를 위해 basename으로 파일명만 추출
        const targetFilename = path.basename(params.filename || defaultFilename);
        const fullPath = path.join(dir, targetFilename);

        fs.writeFileSync(fullPath, params.content, 'utf-8');
        return { success: true, filename: targetFilename, fullPath };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    }
  );

  // 앱 하위 backups 디렉토리에서 백업 파일 불러오기
  ipcMain.handle(
    'backup:loadAppBackup',
    async (_event, filenameOrPath: string) => {
      try {
        const dir = getAppBackupsDir();
        let fullPath: string;
        if (path.isAbsolute(filenameOrPath)) {
          fullPath = filenameOrPath;
        } else {
          const safeName = path.basename(filenameOrPath);
          fullPath = path.join(dir, safeName);
        }

        if (!fs.existsSync(fullPath)) {
          return {
            success: false,
            error: '지정한 백업 파일을 찾을 수 없습니다.',
          };
        }

        const raw = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(raw);
        return { success: true, data, fullPath };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    }
  );

  // 앱 하위 backups 폴더를 파일 탐색기에서 열기
  ipcMain.handle('backup:openDirectory', async () => {
    try {
      const dir = getAppBackupsDir();
      await shell.openPath(dir);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  });

  // =========================================================================
  // GitHub Releases (x2tora/Migratify) 기반 자동 업데이트 확인 및 즉시 설치
  // =========================================================================
  const GITHUB_REPO = 'x2tora/Migratify';
  let activeUpdateAbortController: AbortController | null = null;

  const normalizeVersion = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const compareSemver = (a: string, b: string): number => {
    const pa = normalizeVersion(a);
    const pb = normalizeVersion(b);
    const len = Math.max(pa.length, pb.length, 3);
    for (let i = 0; i < len; i += 1) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  };

  const isAllowedGithubDownloadUrl = (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'github.com' ||
        host.endsWith('.github.com') ||
        host === 'objects.githubusercontent.com' ||
        host === 'release-assets.githubusercontent.com' ||
        host.endsWith('.githubusercontent.com')
      );
    } catch {
      return false;
    }
  };

  ipcMain.handle('update:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('update:check', async () => {
    const currentVersion = app.getVersion();
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
      const response = await net.fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `Migratify/${currentVersion}`,
        },
      });

      if (response.status === 404) {
        return {
          success: true,
          hasUpdate: false,
          noReleasesYet: true,
          currentVersion,
          latestVersion: currentVersion,
          htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          hasUpdate: false,
          currentVersion,
          error: `GitHub API 응답 오류 (HTTP ${response.status})`,
        };
      }

      const release = (await response.json()) as {
        tag_name?: string;
        name?: string;
        body?: string;
        published_at?: string;
        html_url?: string;
        assets?: Array<{
          name?: string;
          size?: number;
          browser_download_url?: string;
        }>;
      };

      const rawTag = release.tag_name || '';
      const latestVersion = rawTag.replace(/^v/i, '') || currentVersion;
      const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

      const assets = Array.isArray(release.assets) ? release.assets : [];
      const exeAsset =
        assets.find(
          (a) =>
            typeof a.name === 'string' &&
            /^Migratify-Setup-.*\.exe$/i.test(a.name)
        ) ||
        assets.find(
          (a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe')
        );

      return {
        success: true,
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName: release.name || rawTag || `v${latestVersion}`,
        releaseNotes: release.body || '',
        publishedAt: release.published_at || '',
        htmlUrl:
          release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
        downloadUrl: exeAsset?.browser_download_url || null,
        assetName: exeAsset?.name || null,
        assetSize: typeof exeAsset?.size === 'number' ? exeAsset.size : 0,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        hasUpdate: false,
        currentVersion,
        error: msg,
      };
    }
  });

  ipcMain.handle(
    'update:downloadAndInstall',
    async (
      _event,
      params: { downloadUrl: string; assetName?: string | null; latestVersion?: string }
    ) => {
      try {
        if (!params?.downloadUrl || !isAllowedGithubDownloadUrl(params.downloadUrl)) {
          return {
            success: false,
            error: '허용되지 않은 업데이트 다운로드 경로입니다.',
          };
        }

        if (activeUpdateAbortController) {
          activeUpdateAbortController.abort();
        }
        activeUpdateAbortController = new AbortController();

        const rawName = params.assetName
          ? path.basename(params.assetName)
          : `Migratify-Setup-${params.latestVersion || 'latest'}.exe`;
        const safeName = rawName.toLowerCase().endsWith('.exe')
          ? rawName
          : `${rawName}.exe`;
        const destPath = path.join(app.getPath('temp'), safeName);

        const response = await net.fetch(params.downloadUrl, {
          headers: {
            'User-Agent': `Migratify/${app.getVersion()}`,
          },
          signal: activeUpdateAbortController.signal,
        });

        if (!response.ok || !response.body) {
          return {
            success: false,
            error: `설치 파일 다운로드 실패 (HTTP ${response.status})`,
          };
        }

        const totalBytes = Number(response.headers.get('content-length') || 0);
        const reader = response.body.getReader();
        const fileStream = fs.createWriteStream(destPath);
        let transferred = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              fileStream.write(Buffer.from(value));
              transferred += value.byteLength;
              const percent =
                totalBytes > 0
                  ? Math.min(100, Math.round((transferred / totalBytes) * 100))
                  : 0;
              mainWindow?.webContents.send('update:progress', {
                percent,
                transferred,
                total: totalBytes,
              });
            }
          }

          await new Promise<void>((resolve, reject) => {
            fileStream.on('finish', () => resolve());
            fileStream.on('error', (err) => reject(err));
            fileStream.end();
          });
        } catch (streamErr) {
          fileStream.destroy();
          if (fs.existsSync(destPath)) {
            try {
              fs.unlinkSync(destPath);
            } catch {
              // ignore cleanup failure
            }
          }
          throw streamErr;
        } finally {
          activeUpdateAbortController = null;
        }

        const stat = fs.statSync(destPath);
        if (stat.size <= 0) {
          return {
            success: false,
            error: '다운로드된 설치 파일이 비어 있습니다.',
          };
        }

        // 인스톨러를 독립 프로세스로 실행하고 현재 앱을 종료하여 즉시 덮어쓰기 업데이트 진행
        const child = spawn(destPath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        setTimeout(() => {
          app.quit();
        }, 350);

        return { success: true, filePath: destPath };
      } catch (error) {
        const isAbort =
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('abort'));
        if (isAbort) {
          return { success: false, canceled: true };
        }
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    }
  );

  ipcMain.handle('update:cancel', () => {
    if (activeUpdateAbortController) {
      activeUpdateAbortController.abort();
      activeUpdateAbortController = null;
    }
    return true;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeActiveAuthServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
