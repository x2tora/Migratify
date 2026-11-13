// Spotify 인증 토큰 정보 인터페이스
export interface SpotifyTokenInfo {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  scope?: string;
  token_type?: string;
}

// Spotify 사용자 프로필 인터페이스
export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  product?: string;
  country?: string;
  followers?: { total: number };
}

// 개별 트랙 상세 정보 인터페이스
export interface SpotifyTrackItem {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string;
  albumImageUrl?: string;
  durationMs: number;
  addedAt?: string;
  isLocal?: boolean;
  selected?: boolean;
}

// 저장한 앨범 정보 인터페이스
export interface SpotifyAlbumItem {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  imageUrl?: string;
  releaseDate?: string;
  totalTracks: number;
  addedAt?: string;
  selected?: boolean;
}

// 팔로우한 아티스트 정보 인터페이스
export interface SpotifyArtistItem {
  id: string;
  uri: string;
  name: string;
  genres: string[];
  imageUrl?: string;
  followersTotal?: number;
  selected?: boolean;
}

// 팔로우한 팟캐스트(쇼/프로그램) 정보 인터페이스
export interface SpotifyShowItem {
  id: string;
  uri: string;
  name: string;
  publisher: string;
  description: string;
  imageUrl?: string;
  totalEpisodes: number;
  addedAt?: string;
  selected?: boolean;
}

// 플레이리스트 요약 및 커스텀 설정 인터페이스
export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  public: boolean;
  collaborative: boolean;
  tracksTotal: number;
  imageUrl?: string;
  selected: boolean;
  customName: string;
  customDescription: string;
  customPublic: boolean;
  cachedTracks?: SpotifyTrackItem[];
}

// 기존 계정의 전체 라이브러리 통계 요약 인터페이스
export interface LibrarySummaryCounts {
  likedSongsTotal: number;
  followedArtistsTotal: number;
  savedAlbumsTotal: number;
  savedShowsTotal: number;
  playlistsTotal: number;
}

// 플레이리스트 중복 처리 전략 타입
export type PlaylistDuplicateMode = 'merge' | 'create_new' | 'skip_existing';

// 마이그레이션 세부 설정 옵션 인터페이스
export interface MigrationConfig {
  includeLikedSongs: boolean;
  includeFollowedArtists: boolean;
  includeSavedAlbums: boolean;
  includeSavedShows: boolean;
  skipDuplicateLibraryItems: boolean;
  playlistDuplicateMode: PlaylistDuplicateMode;
  preserveLikedOrder: boolean;
  wipeDestinationBeforeMigration?: boolean;
}

// 계정 데이터 삭제 대상 카테고리 타입
export type AccountCleanupCategory =
  | 'playlists'
  | 'liked_songs'
  | 'saved_albums'
  | 'followed_artists'
  | 'saved_shows';

// 계정 데이터 삭제 결과 단위 리포트 인터페이스
export interface AccountCleanupReport {
  category: AccountCleanupCategory;
  title: string;
  totalCount: number;
  deletedCount: number;
  failedCount: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  errorMessage?: string;
}

// 개별 마이그레이션 작업 단위 결과 리포트 인터페이스
export interface MigrationTaskReport {
  id: string;
  category:
    | 'liked_songs'
    | 'followed_artists'
    | 'saved_albums'
    | 'saved_shows'
    | 'playlist';
  title: string;
  totalCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'skipped';
  errorMessage?: string;
  playlistId?: string;
}

// 실시간 로그 엔트리 인터페이스
export interface MigrationLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

// 로컬 백업 아카이브(JSON) 데이터 구조
export interface SpotifyBackupArchive {
  schemaVersion: string;
  exportedAt: string;
  sourceUser: SpotifyUserProfile;
  likedTracks: SpotifyTrackItem[];
  savedAlbums: SpotifyAlbumItem[];
  followedArtists: SpotifyArtistItem[];
  savedShows?: SpotifyShowItem[];
  playlists: Array<{
    id: string;
    name: string;
    description: string;
    public: boolean;
    tracks: SpotifyTrackItem[];
  }>;
}

// 단계별 상세 튜토리얼 슬라이드 인터페이스
export interface TutorialSlide {
  stepNumber: number;
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  copyableText?: {
    label: string;
    value: string;
  };
  externalLink?: {
    label: string;
    url: string;
  };
  warningBox?: {
    title: string;
    content: string;
  };
}

// 단계별 튜토리얼 그룹 인터페이스
export interface StepTutorialGuide {
  stepIndex: number;
  stepTitle: string;
  stepSubtitle: string;
  slides: TutorialSlide[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
}

// Electron 브릿지 글로벌 타입 선언
export interface ElectronBridgeAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  isWindowMaximized?: () => Promise<boolean>;
  onWindowMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void;
  closeWindow: () => Promise<void>;
  openExternal: (url: string) => Promise<boolean>;
  getStorage: () => Promise<Record<string, unknown>>;
  setStorage: (data: Record<string, unknown>) => Promise<boolean>;
  clearTokens: () => Promise<boolean>;
  loginSpotify: (params: {
    target: 'src' | 'dst';
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    switchAccount?: boolean;
    openMode?: 'default_browser' | 'copy_only';
  }) => Promise<{
    success: boolean;
    tokenInfo?: SpotifyTokenInfo;
    error?: string;
  }>;
  cancelLogin: () => Promise<boolean>;
  getAuthorizeUrl: (params: {
    clientId: string;
    redirectUri?: string;
  }) => Promise<string>;
  refreshSpotifyToken: (params: {
    target: 'src' | 'dst';
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<{
    success: boolean;
    tokenInfo?: SpotifyTokenInfo;
    error?: string;
  }>;
  saveBackupFile: (params: {
    defaultName: string;
    content: string;
    format: 'json' | 'csv';
  }) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  openBackupFile: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    data?: SpotifyBackupArchive;
    error?: string;
  }>;
  getBackupsDirectory?: () => Promise<string>;
  listAppBackups?: () => Promise<BackupFileSummary[]>;
  saveAppBackup?: (params: {
    filename?: string;
    content: string;
  }) => Promise<{
    success: boolean;
    filename?: string;
    fullPath?: string;
    error?: string;
  }>;
  loadAppBackup?: (filenameOrPath: string) => Promise<{
    success: boolean;
    data?: SpotifyBackupArchive;
    fullPath?: string;
    error?: string;
  }>;
  openBackupsFolder?: () => Promise<{ success: boolean; error?: string }>;
  getAppVersion?: () => Promise<string>;
  checkForUpdates?: () => Promise<UpdateCheckResult>;
  downloadAndInstallUpdate?: (params: {
    downloadUrl: string;
    assetName?: string | null;
    latestVersion?: string;
  }) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  cancelUpdateDownload?: () => Promise<boolean>;
  onUpdateProgress?: (
    callback: (progress: UpdateProgressInfo) => void
  ) => () => void;
}

// 앱 업데이트 확인 결과 인터페이스
export interface UpdateCheckResult {
  success: boolean;
  hasUpdate: boolean;
  noReleasesYet?: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  htmlUrl?: string;
  downloadUrl?: string | null;
  assetName?: string | null;
  assetSize?: number;
  error?: string;
}

// 앱 업데이트 다운로드 진행률 인터페이스
export interface UpdateProgressInfo {
  percent: number;
  transferred: number;
  total: number;
}

// 2단계 4대 작업 모드 타입
export type WorkflowMode =
  | 'account_to_account' // 1. 계정 > 계정으로 데이터 전송
  | 'backup_to_account' // 2. 백업 파일(JSON) > 계정으로 데이터 전송
  | 'create_backup' // 3. 백업 파일(JSON) 생성
  | 'delete_account_data'; // 4. 계정 데이터 삭제

// 앱 하위 디렉토리에 저장된 백업 파일 시각화 요약 인터페이스
export interface BackupFileSummary {
  filename: string;
  fullPath: string;
  sizeBytes: number;
  createdAt: string;
  sourceUserName?: string;
  sourceUserId?: string;
  sourceUserImage?: string;
  playlistsCount: number;
  likedTracksCount: number;
  savedAlbumsCount: number;
  followedArtistsCount: number;
  savedShowsCount: number;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridgeAPI;
  }
}
