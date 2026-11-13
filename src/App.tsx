import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Copy,
  Disc,
  ExternalLink,
  Eye,
  EyeOff,
  FolderUp,
  Globe,
  Heart,
  HelpCircle,
  KeyRound,
  Link2,
  ListMusic,
  Loader2,
  Lock,
  LogIn,
  Mic2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  Terminal,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  FolderOpen,
  HardDrive,
} from 'lucide-react';
import {
  AccountCleanupCategory,
  BackupFileSummary,
  LibrarySummaryCounts,
  MigrationConfig,
  MigrationLogEntry,
  MigrationTaskReport,
  PlaylistDuplicateMode,
  SpotifyAlbumItem,
  SpotifyArtistItem,
  SpotifyBackupArchive,
  SpotifyPlaylistSummary,
  SpotifyShowItem,
  SpotifyTokenInfo,
  SpotifyTrackItem,
  SpotifyUserProfile,
  UpdateCheckResult,
  UpdateProgressInfo,
  WorkflowMode,
} from './types/spotify';
import { STEP_TUTORIAL_GUIDES, DEFAULT_REDIRECT_URI } from './data/tutorials';
import {
  buildFullBackupArchive,
  executeAccountCleanup,
  executeMigrationEngine,
  fetchAllFollowedArtists,
  fetchAllLikedTracks,
  fetchAllSavedAlbums,
  fetchAllSavedShows,
  fetchLibrarySummary,
  fetchPlaylistTracks,
  fetchUserPlaylists,
  fetchUserProfile,
} from './services/spotifyService';
import { TitleBar } from './components/TitleBar/TitleBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TutorialModal } from './components/TutorialModal/TutorialModal';
import { TutorialDrawer } from './components/TutorialDrawer/TutorialDrawer';
import { PlaylistPreviewModal } from './components/PlaylistPreviewModal/PlaylistPreviewModal';
import { AccountCleanerModal } from './components/AccountCleanerModal/AccountCleanerModal';
import { UpdateModal } from './components/UpdateModal/UpdateModal';
import { MigrationPipeline } from './components/MigrationPipeline/MigrationPipeline';
import { Tooltip, GlobalTooltipProvider } from './components/Tooltip/Tooltip';

// 3단계에서 선택 가능한 5대 카테고리 탭 타입
type SelectionCategoryTab =
  | 'playlists'
  | 'liked_songs'
  | 'saved_albums'
  | 'followed_artists'
  | 'saved_shows';

// 보기 필터 상태 타입
type ItemViewFilter = 'all' | 'mine' | 'external' | 'selected' | 'unselected';

// 정렬 기준 상태 타입
type ItemSortMode = 'default' | 'name_asc' | 'count_desc' | 'count_asc';

// 숫자가 바뀔 때 부드럽게 카운트업 애니메이션을 수행하는 컴포넌트
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const previousRef = useRef<number>(value);

  useEffect(() => {
    const startVal = previousRef.current;
    const endVal = value;
    previousRef.current = value;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const duration = 380;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
};

// 밀리초를 mm:ss 문자열로 포맷하는 헬퍼 함수
function formatDurationShort(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// 액센트 컬러(#C6A0F6 / #8445DF) 및 스프링 모션이 적용된 토글 스위치 컴포넌트
const ShadcnSwitch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="interactive-btn inline-flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer group"
    >
      <span
        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-250 flex items-center ${
          checked
            ? 'bg-spotify'
            : 'bg-zinc-200 dark:bg-zinc-800'
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full transition-transform duration-250 shadow-2xs ${
            checked
              ? 'translate-x-3.5 bg-spotify-fg scale-105'
              : 'translate-x-0 bg-white dark:bg-zinc-400'
          }`}
        />
      </span>
      <span className="font-medium group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
        {label}
      </span>
    </button>
  );
};

// 메인 애플리케이션 컴포넌트
export const App: React.FC = () => {
  // 테마 및 레이아웃 상태
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(0);

  // 튜토리얼 모달 및 플로팅 Drawer 상태
  const [isStepModalOpen, setIsStepModalOpen] = useState<boolean>(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState<boolean>(false);
  const [autoShowDisabled, setAutoShowDisabled] = useState<boolean>(false);
  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({
    0: true,
  });
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  // 1단계: API 자격 증명 상태
  const [clientId, setClientId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [copiedRedirect, setCopiedRedirect] = useState<boolean>(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // 2단계: 계정 연동 및 백업 소스 상태
  const [srcToken, setSrcToken] = useState<SpotifyTokenInfo | null>(null);
  const [dstToken, setDstToken] = useState<SpotifyTokenInfo | null>(null);
  const [srcUser, setSrcUser] = useState<SpotifyUserProfile | null>(null);
  const [dstUser, setDstUser] = useState<SpotifyUserProfile | null>(null);
  const [srcSummary, setSrcSummary] = useState<LibrarySummaryCounts | null>(null);
  const [dstSummary, setDstSummary] = useState<LibrarySummaryCounts | null>(null);
  const [backupArchive, setBackupArchive] = useState<SpotifyBackupArchive | null>(
    null
  );

  // 실제 스포티파이 계정 로그인 상태 (1, 3, 4번 모드 전용 라이브 세션 보존)
  const [liveSrcToken, setLiveSrcToken] = useState<SpotifyTokenInfo | null>(null);
  const [liveSrcUser, setLiveSrcUser] = useState<SpotifyUserProfile | null>(null);
  const [liveSrcSummary, setLiveSrcSummary] =
    useState<LibrarySummaryCounts | null>(null);
  const [livePlaylists, setLivePlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [liveLikedTracks, setLiveLikedTracks] = useState<SpotifyTrackItem[]>([]);
  const [liveSavedAlbums, setLiveSavedAlbums] = useState<SpotifyAlbumItem[]>([]);
  const [liveFollowedArtists, setLiveFollowedArtists] = useState<
    SpotifyArtistItem[]
  >([]);
  const [liveSavedShows, setLiveSavedShows] = useState<SpotifyShowItem[]>([]);
  const [liveIsLikedLoaded, setLiveIsLikedLoaded] = useState<boolean>(false);
  const [liveIsAlbumsLoaded, setLiveIsAlbumsLoaded] = useState<boolean>(false);
  const [liveIsArtistsLoaded, setLiveIsArtistsLoaded] = useState<boolean>(false);
  const [liveIsShowsLoaded, setLiveIsShowsLoaded] = useState<boolean>(false);
  // 2단계 4대 작업 모드 선택 상태 ('account_to_account' | 'backup_to_account' | 'create_backup' | 'delete_account_data')
  const [workflowMode, setWorkflowMode] =
    useState<WorkflowMode>('account_to_account');
  const [appBackups, setAppBackups] = useState<BackupFileSummary[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [selectedBackupFilename, setSelectedBackupFilename] = useState<
    string | null
  >(null);
  const [backupsDirectoryPath, setBackupsDirectoryPath] = useState<string>('');
  const [authLoadingTarget, setAuthLoadingTarget] = useState<'src' | 'dst' | null>(
    null
  );
  const [authLoadingMode, setAuthLoadingMode] = useState<
    'default' | 'switch' | 'copy'
  >('default');
  const [copiedAuthUrlTarget, setCopiedAuthUrlTarget] = useState<
    'src' | 'dst' | null
  >(null);
  const [authError, setAuthError] = useState<{
    target: 'src' | 'dst';
    message: string;
    is403: boolean;
    is429?: boolean;
  } | null>(null);

  // 3단계: 5대 카테고리별 개별 항목 목록 및 선택 상태
  const [activeCategoryTab, setActiveCategoryTab] =
    useState<SelectionCategoryTab>('playlists');
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [likedTracks, setLikedTracks] = useState<SpotifyTrackItem[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<SpotifyAlbumItem[]>([]);
  const [followedArtists, setFollowedArtists] = useState<SpotifyArtistItem[]>([]);
  const [savedShows, setSavedShows] = useState<SpotifyShowItem[]>([]);

  // 각 카테고리 상세 목록 로드 여부 및 로딩 상태
  const [isLikedLoaded, setIsLikedLoaded] = useState<boolean>(false);
  const [isLoadingLiked, setIsLoadingLiked] = useState<boolean>(false);
  const [likedLoadProgress, setLikedLoadProgress] = useState<{
    loaded: number;
    total: number;
  }>({ loaded: 0, total: 0 });
  const [isAlbumsLoaded, setIsAlbumsLoaded] = useState<boolean>(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState<boolean>(false);
  const [isArtistsLoaded, setIsArtistsLoaded] = useState<boolean>(false);
  const [isLoadingArtists, setIsLoadingArtists] = useState<boolean>(false);
  const [isShowsLoaded, setIsShowsLoaded] = useState<boolean>(false);
  const [isLoadingShows, setIsLoadingShows] = useState<boolean>(false);

  // 검색, 보기 필터, 정렬 및 빠른 선택 피드백 토스트 상태
  const [itemSearch, setItemSearch] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<ItemViewFilter>('all');
  const [sortMode, setSortMode] = useState<ItemSortMode>('default');
  const [visibleLikedLimit, setVisibleLikedLimit] = useState<number>(150);
  const [quickSelectFeedback, setQuickSelectFeedback] = useState<{
    key: number;
    text: string;
  } | null>(null);

  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig>({
    includeLikedSongs: true,
    includeFollowedArtists: true,
    includeSavedAlbums: true,
    includeSavedShows: true,
    skipDuplicateLibraryItems: true,
    playlistDuplicateMode: 'merge',
    preserveLikedOrder: true,
    wipeDestinationBeforeMigration: false,
  });
  // 계정 데이터 삭제 시 사전 JSON 백업 자동 보존 여부
  const [backupBeforeDelete, setBackupBeforeDelete] = useState<boolean>(true);
  const [isCleanerModalOpen, setIsCleanerModalOpen] = useState<boolean>(false);
  const [previewPlaylist, setPreviewPlaylist] =
    useState<SpotifyPlaylistSummary | null>(null);
  const [previewTracks, setPreviewTracks] = useState<SpotifyTrackItem[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // 4단계: 마이그레이션 실행 및 리포트 상태
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatusText, setProgressStatusText] =
    useState<string>('마이그레이션 시작 대기 중');
  const [taskReports, setTaskReports] = useState<MigrationTaskReport[]>([]);
  const [logs, setLogs] = useState<MigrationLogEntry[]>([]);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const cancelMigrationRef = useRef<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  // 마이그레이션 중단 여부 및 재개/처음부터 드롭다운 상태
  const [isMigrationInterrupted, setIsMigrationInterrupted] = useState<boolean>(false);
  const [isResumeDropdownOpen, setIsResumeDropdownOpen] = useState<boolean>(false);
  const resumeDropdownRef = useRef<HTMLDivElement | null>(null);

  // GSAP 무대 및 카테고리 탭 모션 참조
  const mainStageRef = useRef<HTMLElement | null>(null);
  const categoryListRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const toastRef = useRef<HTMLSpanElement | null>(null);

  // 앱 자동 업데이트 확인 및 다운로드 상태
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgressInfo | null>(null);
  const [updateDownloadError, setUpdateDownloadError] = useState<string | null>(null);

  const handleCheckForUpdates = async (silent = false): Promise<void> => {
    try {
      if (!window.electronAPI?.checkForUpdates) return;
      if (!silent) {
        setIsCheckingUpdate(true);
        setUpdateDownloadError(null);
      }
      const result = await window.electronAPI.checkForUpdates();
      if (result.currentVersion) {
        setAppVersion(result.currentVersion);
      }
      if (!silent || (result.success && result.hasUpdate)) {
        setUpdateInfo(result);
      }
    } catch (error) {
      if (!silent) {
        const msg = error instanceof Error ? error.message : String(error);
        setUpdateInfo({
          success: false,
          hasUpdate: false,
          currentVersion: appVersion,
          error: msg,
        });
      }
    } finally {
      if (!silent) {
        setIsCheckingUpdate(false);
      }
    }
  };

  const handleOpenUpdateModal = (): void => {
    setIsUpdateModalOpen(true);
    setUpdateDownloadError(null);
    if (!updateInfo || !updateInfo.success) {
      void handleCheckForUpdates(false);
    }
  };

  const handleStartUpdate = async (): Promise<void> => {
    if (!updateInfo?.downloadUrl || !window.electronAPI?.downloadAndInstallUpdate) {
      return;
    }
    try {
      setIsDownloadingUpdate(true);
      setUpdateDownloadError(null);
      setUpdateProgress({ percent: 0, transferred: 0, total: updateInfo.assetSize || 0 });
      const res = await window.electronAPI.downloadAndInstallUpdate({
        downloadUrl: updateInfo.downloadUrl,
        assetName: updateInfo.assetName,
        latestVersion: updateInfo.latestVersion,
      });
      if (!res.success && !res.canceled) {
        setUpdateDownloadError(res.error || '업데이트 설치 파일 다운로드에 실패했습니다.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setUpdateDownloadError(msg);
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleCancelUpdateDownload = async (): Promise<void> => {
    try {
      await window.electronAPI?.cancelUpdateDownload?.();
    } catch (error) {
      console.error('업데이트 다운로드 취소 오류:', error);
    } finally {
      setIsDownloadingUpdate(false);
      setUpdateProgress(null);
    }
  };

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((ver) => {
      if (ver) setAppVersion(ver);
    });
    void handleCheckForUpdates(true);

    const unsubscribeProgress = window.electronAPI?.onUpdateProgress?.((prog) => {
      setUpdateProgress(prog);
    });
    return () => {
      unsubscribeProgress?.();
    };
  }, []);

  // 드롭다운 외부 클릭 시 닫기 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resumeDropdownRef.current &&
        !resumeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsResumeDropdownOpen(false);
      }
    };
    if (isResumeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResumeDropdownOpen]);

  // 로그 기록 추가 헬퍼 함수
  const appendLog = (
    level: MigrationLogEntry['level'],
    message: string
  ): void => {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp,
        level,
        message,
      },
    ]);
  };

  // 빠른 선택 동작 시각 피드백 표시 함수
  const triggerQuickFeedback = (text: string): void => {
    const key = Date.now();
    setQuickSelectFeedback({ key, text });
    setTimeout(() => {
      setQuickSelectFeedback((prev) => (prev?.key === key ? null : prev));
    }, 2400);
  };

  // 다크 모드 클래스 동기화
  useEffect(() => {
    const rootEl = document.documentElement;
    if (isDarkMode) {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
  }, [isDarkMode]);

  // F1 단축키로 도움말 Drawer 열기/닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 초기 설정 및 저장된 자격 증명 불러오기
  useEffect(() => {
    const loadSavedSettings = async (): Promise<void> => {
      try {
        if (!window.electronAPI) return;
        const stored = await window.electronAPI.getStorage();
        if (typeof stored.clientId === 'string') {
          setClientId(stored.clientId);
        }
        if (typeof stored.clientSecret === 'string') {
          setClientSecret(stored.clientSecret);
        }
        if (typeof stored.autoShowDisabled === 'boolean') {
          setAutoShowDisabled(stored.autoShowDisabled);
        }
        if (stored.checklistState && typeof stored.checklistState === 'object') {
          setChecklistState(stored.checklistState as Record<string, boolean>);
        }
      } catch (error) {
        console.error('초기 설정 로드 실패:', error);
      }
    };
    loadSavedSettings();
  }, []);

  // 로그 추가 시 스크롤 하단 이동
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 출발 계정의 세부 보관함 항목 개별 온디맨드 로드 함수 (API 쿼터 보호 및 속도 최적화)
  const loadLikedTracksOnDemand = async (token?: string): Promise<void> => {
    const act = token || srcToken?.access_token;
    if (!act || isLikedLoaded || isLoadingLiked) return;
    setIsLoadingLiked(true);
    try {
      const tracks = await fetchAllLikedTracks(act, (loaded, total) => {
        setLikedLoadProgress({ loaded, total });
      });
      setLikedTracks(tracks);
      setIsLikedLoaded(true);
      if (workflowMode !== 'backup_to_account') {
        setLiveLikedTracks(tracks);
        setLiveIsLikedLoaded(true);
      }
    } catch (err) {
      console.error('좋아요 곡 목록 로드 실패:', err);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const loadSavedAlbumsOnDemand = async (token?: string): Promise<void> => {
    const act = token || srcToken?.access_token;
    if (!act || isAlbumsLoaded || isLoadingAlbums) return;
    setIsLoadingAlbums(true);
    try {
      const albums = await fetchAllSavedAlbums(act);
      setSavedAlbums(albums);
      setIsAlbumsLoaded(true);
      if (workflowMode !== 'backup_to_account') {
        setLiveSavedAlbums(albums);
        setLiveIsAlbumsLoaded(true);
      }
    } catch (err) {
      console.error('앨범 목록 로드 실패:', err);
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const loadFollowedArtistsOnDemand = async (token?: string): Promise<void> => {
    const act = token || srcToken?.access_token;
    if (!act || isArtistsLoaded || isLoadingArtists) return;
    setIsLoadingArtists(true);
    try {
      const artists = await fetchAllFollowedArtists(act);
      setFollowedArtists(artists);
      setIsArtistsLoaded(true);
      if (workflowMode !== 'backup_to_account') {
        setLiveFollowedArtists(artists);
        setLiveIsArtistsLoaded(true);
      }
    } catch (err) {
      console.error('아티스트 목록 로드 실패:', err);
    } finally {
      setIsLoadingArtists(false);
    }
  };

  const loadSavedShowsOnDemand = async (token?: string): Promise<void> => {
    const act = token || srcToken?.access_token;
    if (!act || isShowsLoaded || isLoadingShows) return;
    setIsLoadingShows(true);
    try {
      const shows = await fetchAllSavedShows(act);
      setSavedShows(shows);
      setIsShowsLoaded(true);
      if (workflowMode !== 'backup_to_account') {
        setLiveSavedShows(shows);
        setLiveIsShowsLoaded(true);
      }
    } catch (err) {
      console.error('팟캐스트 목록 로드 실패:', err);
    } finally {
      setIsLoadingShows(false);
    }
  };

  const loadSourceLibraryDetails = async (accessToken: string): Promise<void> => {
    loadSavedAlbumsOnDemand(accessToken);
    loadFollowedArtistsOnDemand(accessToken);
    loadSavedShowsOnDemand(accessToken);
    loadLikedTracksOnDemand(accessToken);
  };

  // 장면 전환 방향 상태
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>(
    'forward'
  );
  const [tabDirection, setTabDirection] = useState<'right' | 'left'>('right');

  // 단계 전환 시 GSAP 슬라이드 및 카드 스태거 모션 (출렁임 없는 탄탄한 power2.out)
  useEffect(() => {
    if (!mainStageRef.current) return;
    const targetSection = mainStageRef.current.querySelector<HTMLElement>('section[data-od-id^="step-"]');
    if (!targetSection) return;

    const startX = stepDirection === 'forward' ? 16 : -16;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targetSection,
        { x: startX, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      const cards = targetSection.querySelectorAll<HTMLElement>('.interactive-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 6, opacity: 0.85 },
          { y: 0, opacity: 1, duration: 0.2, stagger: 0.02, ease: 'power2.out' }
        );
      }
      if (dockRef.current) {
        gsap.fromTo(
          dockRef.current,
          { opacity: 0.85, y: stepDirection === 'forward' ? -4 : 4 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        );
      }
    }, mainStageRef);

    return () => ctx.revert();
  }, [currentStep, stepDirection]);

  // 3단계 카테고리 탭/필터/정렬 전환 시 GSAP 모션 (리스트 행 캐스케이드)
  useEffect(() => {
    if (currentStep !== 2 || !categoryListRef.current) return;
    const startX = tabDirection === 'right' ? 12 : -12;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        categoryListRef.current,
        { x: startX, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }
      );
      const items = categoryListRef.current?.querySelectorAll<HTMLElement>('.stagger-list > div');
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0.7, y: 4 },
          { opacity: 1, y: 0, duration: 0.18, stagger: 0.015, ease: 'power2.out' }
        );
      }
    }, categoryListRef);

    return () => ctx.revert();
  }, [activeCategoryTab, viewFilter, sortMode, currentStep, tabDirection]);

  // 빠른 피드백 토스트 알림 GSAP 모션
  useEffect(() => {
    if (quickSelectFeedback && toastRef.current) {
      gsap.fromTo(
        toastRef.current,
        { y: 4, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' }
      );
    }
  }, [quickSelectFeedback]);

  // 단계 전환 처리 함수
  const navigateToStep = (nextStep: number): void => {
    try {
      if (nextStep !== currentStep) {
        setStepDirection(nextStep > currentStep ? 'forward' : 'backward');
      }
      setCurrentStep(nextStep);
      setMaxReachedStep((prev) => Math.max(prev, nextStep));
      if (!visitedSteps[nextStep]) {
        setVisitedSteps((prev) => ({ ...prev, [nextStep]: true }));
      }
    } catch (error) {
      console.error('단계 전환 오류:', error);
    }
  };

  // 카테고리 탭 전환 시 방향성 슬라이드 계산 및 필터 초기화 함수
  const handleSelectCategoryTab = (tab: SelectionCategoryTab): void => {
    const tabOrder: SelectionCategoryTab[] = [
      'playlists',
      'liked_songs',
      'saved_albums',
      'followed_artists',
      'saved_shows',
    ];
    const prevIdx = tabOrder.indexOf(activeCategoryTab);
    const nextIdx = tabOrder.indexOf(tab);
    if (nextIdx !== prevIdx) {
      setTabDirection(nextIdx > prevIdx ? 'right' : 'left');
    }
    setActiveCategoryTab(tab);
    if (tab !== 'playlists' && (viewFilter === 'mine' || viewFilter === 'external')) {
      setViewFilter('all');
    }
    if (srcToken) {
      if (tab === 'liked_songs') loadLikedTracksOnDemand();
      else if (tab === 'saved_albums') loadSavedAlbumsOnDemand();
      else if (tab === 'followed_artists') loadFollowedArtistsOnDemand();
      else if (tab === 'saved_shows') loadSavedShowsOnDemand();
    }
  };

  // 자동 가이드 팝업 표시 여부 토글 함수
  const handleToggleAutoShow = async (disabled: boolean): Promise<void> => {
    try {
      setAutoShowDisabled(disabled);
      await window.electronAPI?.setStorage({ autoShowDisabled: disabled });
    } catch (error) {
      console.error('설정 저장 오류:', error);
    }
  };

  // 사전 점검 체크리스트 토글 함수
  const handleToggleChecklist = async (key: string): Promise<void> => {
    try {
      const updated = { ...checklistState, [key]: !checklistState[key] };
      setChecklistState(updated);
      await window.electronAPI?.setStorage({ checklistState: updated });
    } catch (error) {
      console.error('체크리스트 저장 오류:', error);
    }
  };

  // Redirect URI 복사 함수
  const handleCopyRedirectUri = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DEFAULT_REDIRECT_URI);
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  // OAuth 인증 링크 복사 함수 (브라우저 미작동 시 수동 복사용)
  const handleCopyAuthUrl = async (target: 'src' | 'dst'): Promise<void> => {
    try {
      if (!window.electronAPI) return;
      const url = await window.electronAPI.getAuthorizeUrl({
        clientId: clientId.trim(),
        redirectUri: DEFAULT_REDIRECT_URI,
      });
      await navigator.clipboard.writeText(url);
      setCopiedAuthUrlTarget(target);
      triggerQuickFeedback('브라우저에 붙여넣을 로그인 링크가 복사되었습니다');
      setTimeout(() => setCopiedAuthUrlTarget(null), 2500);
    } catch (error) {
      console.error('인증 링크 복사 실패:', error);
    }
  };

  // 외부 URL 열기 함수
  const handleOpenExternal = async (url: string): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('외부 링크 열기 실패:', error);
    }
  };

  // 1단계 완료 및 2단계 이동 검증 함수
  const handleProceedToStep2 = async (): Promise<void> => {
    try {
      const trimmedId = clientId.trim();
      const trimmedSecret = clientSecret.trim();
      if (!trimmedId || !trimmedSecret) {
        setStep1Error('Spotify 앱의 Client ID와 Client Secret을 모두 입력해 주세요.');
        return;
      }
      if (trimmedId.length < 16 || trimmedSecret.length < 16) {
        setStep1Error(
          '유효한 형식의 32자리 Client ID 및 Client Secret인지 확인해 주세요.'
        );
        return;
      }
      setStep1Error(null);
      await window.electronAPI?.setStorage({
        clientId: trimmedId,
        clientSecret: trimmedSecret,
      });
      navigateToStep(1);
    } catch (error) {
      console.error('1단계 저장 오류:', error);
    }
  };

  // 기본 브라우저(자동완성·캡차 프리) 또는 세션 전환 모드로 Spotify OAuth 로그인 실행 함수
  const handleAuthenticateAccount = async (
    target: 'src' | 'dst',
    options: { switchAccount?: boolean; openMode?: 'default_browser' | 'copy_only' } = {}
  ): Promise<void> => {
    try {
      setAuthError(null);
      setAuthLoadingTarget(target);
      setAuthLoadingMode(
        options.openMode === 'copy_only'
          ? 'copy'
          : options.switchAccount
          ? 'switch'
          : 'default'
      );

      if (!window.electronAPI) {
        throw new Error('Electron 환경에서 실행해야 브라우저 콜백 서버가 동작합니다.');
      }

      if (options.openMode === 'copy_only') {
        const authUrl = await window.electronAPI.getAuthorizeUrl({
          clientId: clientId.trim(),
          redirectUri: DEFAULT_REDIRECT_URI,
        });
        await navigator.clipboard.writeText(authUrl);
        setCopiedAuthUrlTarget(target);
        setTimeout(() => setCopiedAuthUrlTarget(null), 2500);
      }

      const result = await window.electronAPI.loginSpotify({
        target,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: DEFAULT_REDIRECT_URI,
        switchAccount: options.switchAccount,
        openMode: options.openMode || 'default_browser',
      });

      if (!result.success || !result.tokenInfo) {
        throw new Error(result.error || '로그인이 취소되었거나 실패했습니다.');
      }

      const token = result.tokenInfo;
      const profile = await fetchUserProfile(token.access_token);
      const summary = await fetchLibrarySummary(token.access_token);

      if (target === 'src') {
        // 실제 스포티파이 계정 라이브 세션 캐시 갱신
        setLiveSrcToken(token);
        setLiveSrcUser(profile);
        setLiveSrcSummary(summary);
        setLiveLikedTracks([]);
        setLiveSavedAlbums([]);
        setLiveFollowedArtists([]);
        setLiveSavedShows([]);
        setLiveIsLikedLoaded(false);
        setLiveIsAlbumsLoaded(false);
        setLiveIsArtistsLoaded(false);
        setLiveIsShowsLoaded(false);

        let userPlaylists: SpotifyPlaylistSummary[] = [];
        try {
          userPlaylists = await fetchUserPlaylists(token.access_token);
          setLivePlaylists(userPlaylists);
        } catch (plErr) {
          console.warn('플레이리스트 초기 로드 지연 (3단계 진입 시 자동 로드):', plErr);
        }

        // 현재 모드가 백업 파일 복원 모드(2번)가 아닌 경우에만 활성 소스 상태에 즉시 반영
        if (workflowMode !== 'backup_to_account') {
          setSrcToken(token);
          setSrcUser(profile);
          setSrcSummary(summary);
          setIsLikedLoaded(false);
          setIsAlbumsLoaded(false);
          setIsArtistsLoaded(false);
          setIsShowsLoaded(false);
          setPlaylists(userPlaylists);
        }
      } else {
        setDstToken(token);
        setDstUser(profile);
        setDstSummary(summary);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('사용자가 로그인 대기를 취소했습니다')) {
        return;
      }
      const is403 =
        msg.includes('403') ||
        msg.toLowerCase().includes('not registered') ||
        msg.toLowerCase().includes('forbidden');
      const is429 =
        msg.includes('429') ||
        msg.toLowerCase().includes('quota') ||
        msg.includes('한도 초과');
      setAuthError({
        target,
        message: msg,
        is403,
        is429,
      });
    } finally {
      setAuthLoadingTarget(null);
    }
  };

  // 로그인 대기 취소 함수
  const handleCancelAuthWait = async (): Promise<void> => {
    try {
      await window.electronAPI?.cancelLogin();
      setAuthLoadingTarget(null);
    } catch (error) {
      console.error('로그인 취소 오류:', error);
    }
  };

  // 백업 아카이브 데이터를 활성 소스 상태에 바인딩하는 공통 헬퍼 함수
  const bindArchiveToActiveSource = (archive: SpotifyBackupArchive): void => {
    setSrcToken(null);
    setSrcUser(archive.sourceUser);
    setSrcSummary({
      likedSongsTotal: archive.likedTracks?.length ?? 0,
      followedArtistsTotal: archive.followedArtists?.length ?? 0,
      savedAlbumsTotal: archive.savedAlbums?.length ?? 0,
      savedShowsTotal: archive.savedShows?.length ?? 0,
      playlistsTotal: archive.playlists?.length ?? 0,
    });

    setLikedTracks(
      (archive.likedTracks || []).map((t) => ({ ...t, selected: true }))
    );
    setIsLikedLoaded(true);

    setSavedAlbums(
      (archive.savedAlbums || []).map((al) => ({ ...al, selected: true }))
    );
    setIsAlbumsLoaded(true);

    setFollowedArtists(
      (archive.followedArtists || []).map((ar) => ({ ...ar, selected: true }))
    );
    setIsArtistsLoaded(true);

    setSavedShows(
      (archive.savedShows || []).map((sh) => ({ ...sh, selected: true }))
    );
    setIsShowsLoaded(true);

    const mappedPlaylists: SpotifyPlaylistSummary[] = archive.playlists.map(
      (pl) => ({
        id: pl.id,
        name: pl.name,
        description: pl.description || '',
        ownerId: archive.sourceUser.id,
        ownerName: archive.sourceUser.display_name,
        public: Boolean(pl.public),
        collaborative: false,
        tracksTotal: pl.tracks?.length ?? 0,
        selected: true,
        customName: pl.name,
        customDescription: pl.description || '',
        customPublic: Boolean(pl.public),
        cachedTracks: (pl.tracks || []).map((t) => ({ ...t, selected: true })),
      })
    );
    setPlaylists(mappedPlaylists);
  };

  // 실제 계정 라이브 세션을 활성 소스 상태에 바인딩하거나 미로그인 상태로 초기화하는 헬퍼 함수
  const bindLiveSessionToActiveSource = (): void => {
    if (liveSrcToken && liveSrcUser) {
      setSrcToken(liveSrcToken);
      setSrcUser(liveSrcUser);
      setSrcSummary(liveSrcSummary);
      setPlaylists(livePlaylists);
      setLikedTracks(liveLikedTracks);
      setSavedAlbums(liveSavedAlbums);
      setFollowedArtists(liveFollowedArtists);
      setSavedShows(liveSavedShows);
      setIsLikedLoaded(liveIsLikedLoaded);
      setIsAlbumsLoaded(liveIsAlbumsLoaded);
      setIsArtistsLoaded(liveIsArtistsLoaded);
      setIsShowsLoaded(liveIsShowsLoaded);
    } else {
      setSrcToken(null);
      setSrcUser(null);
      setSrcSummary(null);
      setPlaylists([]);
      setLikedTracks([]);
      setSavedAlbums([]);
      setFollowedArtists([]);
      setSavedShows([]);
      setIsLikedLoaded(false);
      setIsAlbumsLoaded(false);
      setIsArtistsLoaded(false);
      setIsShowsLoaded(false);
    }
  };

  // 2단계 작업 모드 전환 및 소스 상태(실제 계정 vs 백업 파일) 분리 스위칭 함수
  const handleSelectWorkflowMode = (nextMode: WorkflowMode): void => {
    if (nextMode === workflowMode) return;
    setWorkflowMode(nextMode);
    setAuthError(null);

    if (nextMode === 'backup_to_account') {
      if (backupArchive) {
        bindArchiveToActiveSource(backupArchive);
      } else {
        setSrcToken(null);
        setSrcUser(null);
        setSrcSummary(null);
        setPlaylists([]);
        setLikedTracks([]);
        setSavedAlbums([]);
        setFollowedArtists([]);
        setSavedShows([]);
        setIsLikedLoaded(false);
        setIsAlbumsLoaded(false);
        setIsArtistsLoaded(false);
        setIsShowsLoaded(false);
      }
    } else {
      // 1, 3, 4번 모드는 반드시 실제 스포티파이 계정에 로그인해야 함
      bindLiveSessionToActiveSource();
    }
  };

  // 로컬 백업 JSON 아카이브를 라이브러리 상태에 반영하는 공통 함수
  const applyLoadedBackupArchive = (archive: SpotifyBackupArchive): void => {
    if (!archive.sourceUser || !Array.isArray(archive.playlists)) {
      throw new Error('올바른 Spotify 백업 JSON 포맷이 아닙니다.');
    }

    setBackupArchive(archive);
    if (workflowMode === 'backup_to_account') {
      bindArchiveToActiveSource(archive);
    }
  };

  // 앱 디렉토리 내 백업 파일 목록 갱신 함수
  const refreshAppBackups = async (): Promise<void> => {
    if (!window.electronAPI?.listAppBackups) return;
    try {
      setIsLoadingBackups(true);
      const list = await window.electronAPI.listAppBackups();
      setAppBackups(list);
      if (window.electronAPI.getBackupsDirectory) {
        const dir = await window.electronAPI.getBackupsDirectory();
        setBackupsDirectoryPath(dir);
      }
    } catch (error) {
      console.error('백업 목록 불러오기 실패:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // 앱 내 시각화된 백업 파일 선택 처리 함수
  const handleSelectAppBackup = async (
    item: BackupFileSummary
  ): Promise<void> => {
    try {
      setAuthError(null);
      setSelectedBackupFilename(item.filename);
      if (!window.electronAPI?.loadAppBackup) return;
      const res = await window.electronAPI.loadAppBackup(item.fullPath);
      if (res.success && res.data) {
        applyLoadedBackupArchive(res.data);
        triggerQuickFeedback(`백업 파일 '${item.filename}'이(가) 선택되었습니다`);
      } else {
        setAuthError({
          target: 'src',
          message: res.error || '백업 파일을 읽을 수 없습니다.',
          is403: false,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError({
        target: 'src',
        message: `백업 파일 로드 오류: ${msg}`,
        is403: false,
      });
    }
  };

  // 외부 위치의 백업 JSON 파일 찾아보기 함수
  const handlePickExternalBackup = async (): Promise<void> => {
    try {
      setAuthError(null);
      if (!window.electronAPI?.openBackupFile) return;
      const res = await window.electronAPI.openBackupFile();
      if (res.canceled || !res.success || !res.data) return;
      applyLoadedBackupArchive(res.data);
      const fname = res.filePath
        ? res.filePath.split(/[\\/]/).pop() || '외부 백업 파일'
        : '외부 백업 파일';
      setSelectedBackupFilename(fname);
      triggerQuickFeedback(`외부 백업 '${fname}'을(를) 불러왔습니다`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError({
        target: 'src',
        message: `외부 파일 로드 실패: ${msg}`,
        is403: false,
      });
    }
  };

  // 앱 하위 backups 디렉토리 열기 함수
  const handleOpenBackupsFolder = async (): Promise<void> => {
    try {
      if (window.electronAPI?.openBackupsFolder) {
        await window.electronAPI.openBackupsFolder();
      }
    } catch (err) {
      console.error('백업 폴더 열기 실패:', err);
    }
  };

  // 2단계 진입 또는 백업 모드 전환 시 백업 목록 자동 갱신
  useEffect(() => {
    if (currentStep === 1 && workflowMode === 'backup_to_account') {
      refreshAppBackups();
    }
  }, [currentStep, workflowMode]);

  // 연동 세션 및 토큰 캐시 전체 초기화 함수
  const handleClearSessions = async (): Promise<void> => {
    try {
      await window.electronAPI?.clearTokens();
      setSrcToken(null);
      setDstToken(null);
      setSrcUser(null);
      setDstUser(null);
      setSrcSummary(null);
      setDstSummary(null);
      setBackupArchive(null);
      setSelectedBackupFilename(null);
      setLiveSrcToken(null);
      setLiveSrcUser(null);
      setLiveSrcSummary(null);
      setLivePlaylists([]);
      setLiveLikedTracks([]);
      setLiveSavedAlbums([]);
      setLiveFollowedArtists([]);
      setLiveSavedShows([]);
      setLiveIsLikedLoaded(false);
      setLiveIsAlbumsLoaded(false);
      setLiveIsArtistsLoaded(false);
      setLiveIsShowsLoaded(false);
      setPlaylists([]);
      setLikedTracks([]);
      setSavedAlbums([]);
      setFollowedArtists([]);
      setSavedShows([]);
      setIsLikedLoaded(false);
      setIsAlbumsLoaded(false);
      setIsArtistsLoaded(false);
      setIsShowsLoaded(false);
      setAuthError(null);
      setMaxReachedStep(1);
    } catch (error) {
      console.error('세션 초기화 실패:', error);
    }
  };

  // 2단계 완료 및 3단계 이동 검증 함수 (4대 작업 모드별 검증)
  const handleProceedToStep3 = (): void => {
    try {
      setAuthError(null);

      if (workflowMode === 'account_to_account') {
        if (!srcUser || !srcToken) {
          setAuthError({
            target: 'src',
            message: '음악을 가져올 기존 계정에 로그인해 주세요.',
            is403: false,
          });
          return;
        }
        if (!dstUser || !dstToken) {
          setAuthError({
            target: 'dst',
            message: '데이터를 이전받을 새 계정에 로그인해 주세요.',
            is403: false,
          });
          return;
        }
        if (srcUser.id === dstUser.id) {
          setAuthError({
            target: 'dst',
            message:
              '출발 계정과 도착 계정이 동일합니다. 다른 계정으로 로그인해 주세요.',
            is403: false,
          });
          return;
        }
      } else if (workflowMode === 'backup_to_account') {
        if (!backupArchive) {
          setAuthError({
            target: 'src',
            message: '복원할 백업 파일(JSON)을 선택해 주세요.',
            is403: false,
          });
          return;
        }
        if (!dstUser || !dstToken) {
          setAuthError({
            target: 'dst',
            message: '음악을 전송받을 새 계정에 로그인해 주세요.',
            is403: false,
          });
          return;
        }
      } else if (workflowMode === 'create_backup') {
        if (!srcUser || !srcToken) {
          setAuthError({
            target: 'src',
            message: '백업할 계정에 로그인해 주세요.',
            is403: false,
          });
          return;
        }
      } else if (workflowMode === 'delete_account_data') {
        if (!srcUser || !srcToken) {
          setAuthError({
            target: 'src',
            message: '데이터를 정리할 계정에 로그인해 주세요.',
            is403: false,
          });
          return;
        }
      }

      setAuthError(null);
      if (workflowMode !== 'backup_to_account') {
        bindLiveSessionToActiveSource();
        if (srcToken && (playlists.length === 0 || livePlaylists.length === 0)) {
          fetchUserPlaylists(srcToken.access_token)
            .then((pls) => {
              setPlaylists(pls);
              setLivePlaylists(pls);
            })
            .catch((err) => console.warn('플레이리스트 지연 로드 실패:', err));
        }
      } else {
        if (backupArchive) {
          bindArchiveToActiveSource(backupArchive);
        }
      }
      navigateToStep(2);
    } catch (error) {
      console.error('2단계 검증 오류:', error);
    }
  };

  // 3번 모드: 백업 파일(JSON) 생성 실행 함수
  const handleStartCreateBackup = async (): Promise<void> => {
    try {
      if (!srcToken || !srcUser) {
        setProgressStatusText('백업할 계정의 로그인 정보가 필요합니다.');
        appendLog('error', '백업할 계정의 로그인 정보가 필요합니다.');
        return;
      }
      setIsMigrating(true);
      setProgressPercent(5);
      setProgressStatusText('백업 대상 데이터 수집 중...');
      setLogs([
        {
          id: 'log-b-start',
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `[시작] '${srcUser.display_name}' 계정의 백업 파일 생성을 시작합니다.`,
        },
      ]);

      const selectedPls = playlists.filter((p) => p.selected);
      const archive = await buildFullBackupArchive(
        srcToken.access_token,
        srcUser,
        selectedPls,
        (msg) => {
          setProgressStatusText(msg);
          appendLog('info', msg);
        }
      );

      if (!migrationConfig.includeLikedSongs) archive.likedTracks = [];
      if (!migrationConfig.includeSavedAlbums) archive.savedAlbums = [];
      if (!migrationConfig.includeFollowedArtists) archive.followedArtists = [];
      if (!migrationConfig.includeSavedShows) archive.savedShows = [];

      setProgressPercent(85);
      setProgressStatusText('앱 하위 backups/ 폴더에 JSON 파일 저장 중...');

      const jsonStr = JSON.stringify(archive, null, 2);
      let savedName = 'Migratify-Backup.json';
      if (window.electronAPI?.saveAppBackup) {
        const saveRes = await window.electronAPI.saveAppBackup({
          content: jsonStr,
        });
        if (saveRes.success) {
          savedName = saveRes.filename || savedName;
        } else {
          throw new Error(saveRes.error || '백업 파일 저장에 실패했습니다.');
        }
      }

      setProgressPercent(100);
      setProgressStatusText('백업 파일 생성이 성공적으로 완료되었습니다!');
      appendLog('success', `[완료] 백업 파일이 저장되었습니다: ${savedName}`);
      refreshAppBackups();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setProgressStatusText(`백업 생성 오류: ${msg}`);
      appendLog('error', `[오류] 백업 생성 실패: ${msg}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // 4번 모드: 계정 데이터 삭제 실행 함수
  const handleStartAccountDeletion = async (): Promise<void> => {
    try {
      if (!srcToken || !srcUser) {
        setProgressStatusText('데이터를 삭제할 계정의 로그인 정보가 필요합니다.');
        appendLog('error', '데이터를 삭제할 계정의 로그인 정보가 필요합니다.');
        return;
      }

      const categoriesToDelete: AccountCleanupCategory[] = [];
      if (selectedPlaylistsCount > 0) {
        categoriesToDelete.push('playlists');
      }
      if (migrationConfig.includeLikedSongs && selectedLikedCount > 0) {
        categoriesToDelete.push('liked_songs');
      }
      if (migrationConfig.includeSavedAlbums && selectedAlbumsCount > 0) {
        categoriesToDelete.push('saved_albums');
      }
      if (migrationConfig.includeFollowedArtists && selectedArtistsCount > 0) {
        categoriesToDelete.push('followed_artists');
      }
      if (migrationConfig.includeSavedShows && selectedShowsCount > 0) {
        categoriesToDelete.push('saved_shows');
      }

      if (categoriesToDelete.length === 0) {
        setProgressStatusText('삭제할 카테고리를 최소 1개 이상 선택해 주세요.');
        appendLog('warn', '삭제할 카테고리를 최소 1개 이상 선택해 주세요.');
        return;
      }

      const confirmed = window.confirm(
        `⚠️ 최종 확인: 계정('${srcUser.display_name}')에서 선택한 데이터를 삭제합니다.\n${
          backupBeforeDelete
            ? '삭제 전 JSON 백업 파일이 앱 backups/ 폴더에 자동으로 안전하게 저장됩니다.'
            : '주의: 백업 생성이 비활성화되어 삭제된 항목은 복구할 수 없습니다.'
        }\n\n정말로 진행하시겠습니까?`
      );
      if (!confirmed) return;

      setIsMigrating(true);
      setProgressPercent(2);
      setProgressStatusText('계정 데이터 삭제 준비 중...');
      setLogs([
        {
          id: 'log-del-start',
          timestamp: new Date().toLocaleTimeString(),
          level: 'warn',
          message: `[시작] '${srcUser.display_name}' 계정의 데이터 삭제를 시작합니다.`,
        },
      ]);

      // 삭제 전 JSON 백업 자동 생성 및 보존
      if (backupBeforeDelete) {
        setProgressStatusText('삭제 전 JSON 백업 파일 자동 생성 및 보존 중...');
        appendLog(
          'info',
          '[보존] 삭제 전 데이터 유실 방지를 위해 JSON 백업 아카이브 생성을 시작합니다.'
        );

        const selectedPls = playlists.filter((p) => p.selected);
        const archive = await buildFullBackupArchive(
          srcToken.access_token,
          srcUser,
          selectedPls,
          (msg) => {
            setProgressStatusText(`[백업 보존] ${msg}`);
            appendLog('info', `[백업 보존] ${msg}`);
          }
        );

        if (!migrationConfig.includeLikedSongs) archive.likedTracks = [];
        if (!migrationConfig.includeSavedAlbums) archive.savedAlbums = [];
        if (!migrationConfig.includeFollowedArtists) archive.followedArtists = [];
        if (!migrationConfig.includeSavedShows) archive.savedShows = [];

        const jsonStr = JSON.stringify(archive, null, 2);
        if (window.electronAPI?.saveAppBackup) {
          const saveRes = await window.electronAPI.saveAppBackup({
            content: jsonStr,
          });
          if (saveRes.success) {
            appendLog(
              'success',
              `[보존 완료] 삭제 전 JSON 백업 파일이 안전하게 보존되었습니다: ${saveRes.filename}`
            );
            refreshAppBackups();
          } else {
            throw new Error(
              `백업 파일 저장 실패: ${saveRes.error || '알 수 없는 오류'}. 데이터 보호를 위해 삭제 작업을 중단합니다.`
            );
          }
        }
      }

      await executeAccountCleanup({
        token: srcToken.access_token,
        categories: categoriesToDelete,
        shouldCancel: () => cancelMigrationRef.current,
        onProgress: (p, text) => {
          setProgressPercent(p);
          setProgressStatusText(text);
        },
        onLog: (level, msg) => {
          appendLog(level, msg);
        },
      });

      setProgressPercent(100);
      setProgressStatusText('선택한 데이터 삭제가 완료되었습니다.');
      appendLog('success', `[완료] 선택한 데이터 정리가 성공적으로 완료되었습니다.`);

      fetchLibrarySummary(srcToken.access_token)
        .then(setSrcSummary)
        .catch(() => {});
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setProgressStatusText(`데이터 삭제 오류: ${msg}`);
      appendLog('error', `[오류] 데이터 삭제 실패: ${msg}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // 플레이리스트 상세 미리보기 모달 열기 함수
  const handleOpenPlaylistPreview = async (
    pl: SpotifyPlaylistSummary
  ): Promise<void> => {
    try {
      setPreviewPlaylist(pl);
      if (pl.cachedTracks) {
        setPreviewTracks(pl.cachedTracks);
        return;
      }
      if (!srcToken) return;

      setIsLoadingPreview(true);
      const tracks = await fetchPlaylistTracks(srcToken.access_token, pl.id);
      setPreviewTracks(tracks);
      setPlaylists((prev) =>
        prev.map((item) =>
          item.id === pl.id ? { ...item, cachedTracks: tracks } : item
        )
      );
    } catch (error) {
      console.error('플레이리스트 트랙 미리보기 로드 실패:', error);
      setPreviewTracks([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // 플레이리스트 커스텀 이름/설명/공개 여부 및 개별 트랙 선택 저장 함수
  const handleSavePlaylistCustomization = (
    playlistId: string,
    updates: {
      customName: string;
      customDescription: string;
      customPublic: boolean;
      cachedTracks?: SpotifyTrackItem[];
    }
  ): void => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? {
              ...pl,
              customName: updates.customName,
              customDescription: updates.customDescription,
              customPublic: updates.customPublic,
              cachedTracks: updates.cachedTracks ?? pl.cachedTracks,
            }
          : pl
      )
    );
    triggerQuickFeedback(`'${updates.customName}' 설정이 저장되었습니다`);
  };



  // 마이그레이션 시작 또는 실패 항목 재시도 실행 함수
  const handleStartMigration = async (onlyTaskIds?: string[]): Promise<void> => {
    try {
      if (!dstToken || !dstUser) return;

      if (!onlyTaskIds && migrationConfig.wipeDestinationBeforeMigration) {
        const confirmed = window.confirm(
          `⚠️ 최종 확인: 도착 계정('${dstUser.display_name}')의 기존 데이터를 모두 비운 후 전송을 시작합니다.\n선택된 카테고리의 기존 플레이리스트 및 보관함 항목이 영구 삭제됩니다.\n\n정말로 진행하시겠습니까?`
        );
        if (!confirmed) {
          return;
        }
      }

      cancelMigrationRef.current = false;
      setIsMigrating(true);
      setProgressPercent(0);
      if (!onlyTaskIds) {
        setIsMigrationInterrupted(false);
        setLogs([]);
      }
      appendLog(
        'info',
        onlyTaskIds
          ? `[재개/재시도] 미완료된 ${onlyTaskIds.length}개 항목의 이전을 진행합니다.`
          : `[시작] '${srcUser?.display_name}' -> '${dstUser.display_name}' 계정 데이터 이전을 시작합니다.`
      );

      const selectedPl = playlists.filter((p) => p.selected);

      await executeMigrationEngine({
        srcToken: srcToken?.access_token || null,
        srcUserId: srcUser?.id,
        dstToken: dstToken.access_token,
        dstUserId: dstUser.id,
        config: migrationConfig,
        selectedPlaylists: selectedPl,
        selectedLikedTracks: isLikedLoaded
          ? likedTracks.filter((t) => t.selected !== false)
          : null,
        selectedSavedAlbums: isAlbumsLoaded
          ? savedAlbums.filter((al) => al.selected !== false)
          : null,
        selectedFollowedArtists: isArtistsLoaded
          ? followedArtists.filter((ar) => ar.selected !== false)
          : null,
        selectedSavedShows: isShowsLoaded
          ? savedShows.filter((sh) => sh.selected !== false)
          : null,
        backupSource: workflowMode === 'backup_to_account' ? backupArchive : null,
        onlyTaskIds,
        shouldCancel: () => cancelMigrationRef.current,
        onProgress: (percent, statusText) => {
          setProgressPercent(percent);
          setProgressStatusText(statusText);
        },
        onLog: appendLog,
        onTaskUpdate: (updatedReports) => {
          if (!onlyTaskIds) {
            setTaskReports(updatedReports);
          } else {
            setTaskReports((prev) =>
              prev.map((oldItem) => {
                const retried = updatedReports.find((u) => u.id === oldItem.id);
                return retried || oldItem;
              })
            );
          }
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      appendLog('error', `예기치 못한 오류: ${msg}`);
    } finally {
      setIsMigrating(false);
      if (cancelMigrationRef.current) {
        setIsMigrationInterrupted(true);
      }
    }
  };

  // 중단된 미완료 항목만 골라 이전 재개하는 함수
  const handleResumeMigration = (): void => {
    setIsResumeDropdownOpen(false);
    const incomplete = taskReports.filter((t) => t.status !== 'success');
    if (incomplete.length === 0) {
      triggerQuickFeedback('모든 항목이 이미 완료되었습니다.');
      return;
    }
    handleStartMigration(incomplete.map((t) => t.id));
  };

  // 모든 항목을 처음부터 완전히 다시 시작하는 함수
  const handleRestartMigration = (): void => {
    setIsResumeDropdownOpen(false);
    setIsMigrationInterrupted(false);
    handleStartMigration();
  };

  // =========================================================================
  // 5대 카테고리별 선택 통계 및 필터/정렬 계산
  // =========================================================================
  const selectedPlaylists = playlists.filter((p) => p.selected);
  const selectedPlaylistsCount = selectedPlaylists.length;
  const myOwnedPlaylistsCount = playlists.filter(
    (p) => !srcUser || p.ownerId === srcUser.id
  ).length;
  const externalPlaylistsCount = playlists.length - myOwnedPlaylistsCount;

  const totalLikedCount = isLikedLoaded
    ? likedTracks.length
    : srcSummary?.likedSongsTotal ?? 0;
  const selectedLikedCount = !migrationConfig.includeLikedSongs
    ? 0
    : isLikedLoaded
    ? likedTracks.filter((t) => t.selected !== false).length
    : totalLikedCount;

  const totalAlbumsCount = isAlbumsLoaded
    ? savedAlbums.length
    : srcSummary?.savedAlbumsTotal ?? 0;
  const selectedAlbumsCount = !migrationConfig.includeSavedAlbums
    ? 0
    : isAlbumsLoaded
    ? savedAlbums.filter((a) => a.selected !== false).length
    : totalAlbumsCount;

  const totalArtistsCount = isArtistsLoaded
    ? followedArtists.length
    : srcSummary?.followedArtistsTotal ?? 0;
  const selectedArtistsCount = !migrationConfig.includeFollowedArtists
    ? 0
    : isArtistsLoaded
    ? followedArtists.filter((ar) => ar.selected !== false).length
    : totalArtistsCount;

  const totalShowsCount = isShowsLoaded
    ? savedShows.length
    : srcSummary?.savedShowsTotal ?? 0;
  const selectedShowsCount = !migrationConfig.includeSavedShows
    ? 0
    : isShowsLoaded
    ? savedShows.filter((s) => s.selected !== false).length
    : totalShowsCount;

  const estimatedTotalItems =
    selectedLikedCount +
    selectedAlbumsCount +
    selectedArtistsCount +
    selectedShowsCount +
    selectedPlaylists.reduce(
      (acc, pl) =>
        acc +
        (pl.cachedTracks
          ? pl.cachedTracks.filter((t) => t.selected !== false).length
          : pl.tracksTotal || 1),
      0
    );

  // 카테고리 전체 체크박스 토글 핸들러
  const handleToggleWholeCategory = (
    category: SelectionCategoryTab,
    e: React.MouseEvent
  ): void => {
    e.stopPropagation();
    if (category === 'playlists') {
      const nextSel = selectedPlaylistsCount === 0;
      setPlaylists((prev) => prev.map((p) => ({ ...p, selected: nextSel })));
      triggerQuickFeedback(
        nextSel ? '모든 플레이리스트 선택됨' : '모든 플레이리스트 해제됨'
      );
    } else if (category === 'liked_songs') {
      const nextSel = selectedLikedCount === 0;
      setMigrationConfig((prev) => ({ ...prev, includeLikedSongs: nextSel }));
      if (nextSel && !isLikedLoaded) {
        loadLikedTracksOnDemand();
      } else if (isLikedLoaded) {
        setLikedTracks((prev) => prev.map((t) => ({ ...t, selected: nextSel })));
      }
      triggerQuickFeedback(
        nextSel ? '좋아요한 곡 전체 선택됨' : '좋아요한 곡 전체 해제됨'
      );
    } else if (category === 'saved_albums') {
      const nextSel = selectedAlbumsCount === 0;
      setMigrationConfig((prev) => ({ ...prev, includeSavedAlbums: nextSel }));
      if (nextSel && !isAlbumsLoaded) {
        loadSavedAlbumsOnDemand();
      } else if (isAlbumsLoaded) {
        setSavedAlbums((prev) => prev.map((a) => ({ ...a, selected: nextSel })));
      }
      triggerQuickFeedback(
        nextSel ? '저장한 앨범 전체 선택됨' : '저장한 앨범 전체 해제됨'
      );
    } else if (category === 'followed_artists') {
      const nextSel = selectedArtistsCount === 0;
      setMigrationConfig((prev) => ({
        ...prev,
        includeFollowedArtists: nextSel,
      }));
      if (nextSel && !isArtistsLoaded) {
        loadFollowedArtistsOnDemand();
      } else if (isArtistsLoaded) {
        setFollowedArtists((prev) =>
          prev.map((ar) => ({ ...ar, selected: nextSel }))
        );
      }
      triggerQuickFeedback(
        nextSel ? '팔로우 아티스트 전체 선택됨' : '팔로우 아티스트 전체 해제됨'
      );
    } else if (category === 'saved_shows') {
      const nextSel = selectedShowsCount === 0;
      setMigrationConfig((prev) => ({ ...prev, includeSavedShows: nextSel }));
      if (nextSel && !isShowsLoaded) {
        loadSavedShowsOnDemand();
      } else if (isShowsLoaded) {
        setSavedShows((prev) => prev.map((s) => ({ ...s, selected: nextSel })));
      }
      triggerQuickFeedback(
        nextSel ? '팟캐스트 전체 선택됨' : '팟캐스트 전체 해제됨'
      );
    }
  };

  const searchLower = itemSearch.trim().toLowerCase();

  // 1. 플레이리스트 필터 및 정렬 목록
  const filteredPlaylists = playlists
    .filter((pl) => {
      if (viewFilter === 'mine' && srcUser && pl.ownerId !== srcUser.id) {
        return false;
      }
      if (viewFilter === 'external' && (!srcUser || pl.ownerId === srcUser.id)) {
        return false;
      }
      if (viewFilter === 'selected' && !pl.selected) return false;
      if (viewFilter === 'unselected' && pl.selected) return false;

      if (!searchLower) return true;
      return (
        pl.name.toLowerCase().includes(searchLower) ||
        pl.customName.toLowerCase().includes(searchLower) ||
        pl.ownerName.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'name_asc') {
        return a.customName.localeCompare(b.customName, 'ko');
      }
      if (sortMode === 'count_desc') {
        return b.tracksTotal - a.tracksTotal;
      }
      if (sortMode === 'count_asc') {
        return a.tracksTotal - b.tracksTotal;
      }
      return 0;
    });

  // 2. 좋아요한 곡 필터 및 정렬 목록
  const filteredLikedTracks = likedTracks
    .filter((t) => {
      const isSel = t.selected !== false && migrationConfig.includeLikedSongs;
      if (viewFilter === 'selected' && !isSel) return false;
      if (viewFilter === 'unselected' && isSel) return false;
      if (!searchLower) return true;
      return (
        t.name.toLowerCase().includes(searchLower) ||
        t.artists.join(' ').toLowerCase().includes(searchLower) ||
        t.albumName.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortMode === 'count_desc') {
        return b.durationMs - a.durationMs;
      }
      if (sortMode === 'count_asc') {
        return (a.addedAt || '').localeCompare(b.addedAt || '');
      }
      return 0;
    });

  // 3. 저장한 앨범 필터 및 정렬 목록
  const filteredSavedAlbums = savedAlbums
    .filter((al) => {
      const isSel = al.selected !== false && migrationConfig.includeSavedAlbums;
      if (viewFilter === 'selected' && !isSel) return false;
      if (viewFilter === 'unselected' && isSel) return false;
      if (!searchLower) return true;
      return (
        al.name.toLowerCase().includes(searchLower) ||
        al.artists.join(' ').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortMode === 'count_desc') {
        return b.totalTracks - a.totalTracks;
      }
      if (sortMode === 'count_asc') {
        return a.totalTracks - b.totalTracks;
      }
      return 0;
    });

  // 4. 팔로우한 아티스트 필터 및 정렬 목록
  const filteredFollowedArtists = followedArtists
    .filter((ar) => {
      const isSel =
        ar.selected !== false && migrationConfig.includeFollowedArtists;
      if (viewFilter === 'selected' && !isSel) return false;
      if (viewFilter === 'unselected' && isSel) return false;
      if (!searchLower) return true;
      return (
        ar.name.toLowerCase().includes(searchLower) ||
        ar.genres.join(' ').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortMode === 'count_desc') {
        return (b.followersTotal || 0) - (a.followersTotal || 0);
      }
      if (sortMode === 'count_asc') {
        return (a.followersTotal || 0) - (b.followersTotal || 0);
      }
      return 0;
    });

  // 5. 팔로우한 팟캐스트 필터 및 정렬 목록
  const filteredSavedShows = savedShows
    .filter((sh) => {
      const isSel = sh.selected !== false && migrationConfig.includeSavedShows;
      if (viewFilter === 'selected' && !isSel) return false;
      if (viewFilter === 'unselected' && isSel) return false;
      if (!searchLower) return true;
      return (
        sh.name.toLowerCase().includes(searchLower) ||
        sh.publisher.toLowerCase().includes(searchLower) ||
        sh.description.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortMode === 'count_desc') {
        return b.totalEpisodes - a.totalEpisodes;
      }
      if (sortMode === 'count_asc') {
        return a.totalEpisodes - b.totalEpisodes;
      }
      return 0;
    });

  const failedTasks = taskReports.filter(
    (r) => r.status === 'failed' || r.status === 'partial'
  );
  const totalMigratedItems = taskReports.reduce(
    (acc, r) => acc + r.migratedCount,
    0
  );
  const totalSkippedItems = taskReports.reduce(
    (acc, r) => acc + r.skippedCount,
    0
  );
  const runningTask = taskReports.find((r) => r.status === 'running');
  const currentStepGuide =
    STEP_TUTORIAL_GUIDES[currentStep] || STEP_TUTORIAL_GUIDES[0];

  return (
    <GlobalTooltipProvider>
      <div className="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100 overflow-hidden select-none transition-colors duration-250">
        {/* 상단 타이틀바 */}
        <TitleBar
          currentStepIndex={currentStep}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          onToggleHelpDrawer={() => setIsHelpDrawerOpen((prev) => !prev)}
          onOpenCleanerModal={() => setIsCleanerModalOpen(true)}
          appVersion={appVersion}
          hasAvailableUpdate={Boolean(updateInfo?.success && updateInfo?.hasUpdate)}
          onOpenUpdateModal={handleOpenUpdateModal}
        />

      {/* 메인 본문 레이아웃 */}
      <div className="flex-1 flex min-h-0">
        <Sidebar
          currentStep={currentStep}
          maxReachedStep={maxReachedStep}
          srcUser={srcUser}
          dstUser={dstUser}
          hasBackupLoaded={
            workflowMode === 'backup_to_account' && Boolean(backupArchive)
          }
          workflowMode={workflowMode}
          onSelectStep={navigateToStep}
          onOpenCleanerModal={() => setIsCleanerModalOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent">
          <main ref={mainStageRef} className="relative flex-1 flex flex-col justify-start min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-6">
          {/* 정적인 앰비언트 백그라운드 조명 (붕 붕 떠다니는 애니메이션 제거) */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed top-16 right-12 w-72 h-72 rounded-full bg-spotify/10 blur-3xl z-0"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed bottom-10 left-72 w-64 h-64 rounded-full bg-spotify/8 blur-3xl z-0"
          />

          {/* ========================================================== */}
          {/* STEP 1: API 자격 증명 설정 */}
          {/* ========================================================== */}
          {currentStep === 0 && (
            <section
              key="step-0"
              data-od-id="step-1-credentials"
              className="cascade-cards relative z-10 max-w-5xl w-full mx-auto flex flex-col justify-start gap-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 shrink-0">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    Spotify API 자격 증명 설정
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Spotify Developer Dashboard에서 생성한 앱의 Client ID와
                    Client Secret을 입력해 주세요.
                  </p>
                </div>

                <Tooltip content="스포티파이 개발자 대시보드 새 창으로 열기" side="bottom">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenExternal('https://developer.spotify.com/dashboard')
                    }
                    className="interactive-btn h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Spotify Developer Dashboard 열기</span>
                    <ExternalLink className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                  </button>
                </Tooltip>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 cascade-cards">
                {/* 좌측: 자격 증명 입력 카드 */}
                <div className="interactive-card lg:col-span-7 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-spotify stroke-[1.75]" />
                      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
                        클라이언트 자격 증명
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs bg-spotify-soft text-spotify font-semibold">
                      자동 저장됨
                    </span>
                  </div>

                  {/* Web API 체크 및 설정 안내 팁 */}
                  <div className="p-3 rounded-xl bg-spotify-soft/40 border border-spotify/25 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed flex items-start gap-2">
                    <span className="text-spotify font-bold shrink-0 mt-0.5">•</span>
                    <span>
                      Spotify 대시보드에서 앱(Create app) 생성 시 <strong className="text-spotify font-semibold">Which API/SDKs are you planning to use?</strong> 질문에서 <strong className="text-spotify font-semibold">Web API</strong> 항목에 반드시 체크해 주셔야 정상적인 API 토큰 발급 및 데이터 동기화가 가능합니다.
                    </span>
                  </div>

                  {/* Redirect URI 복사 박스 */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        1. Redirect URIs 등록 주소
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        추가(Add) 후 하단 Save 클릭
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <code className="text-xs sm:text-sm font-mono text-zinc-950 dark:text-zinc-100 select-all">
                        {DEFAULT_REDIRECT_URI}
                      </code>
                      <Tooltip
                        content={
                          copiedRedirect ? '복사 완료!' : 'Redirect URI 클립보드에 복사'
                        }
                        side="top"
                      >
                        <button
                          type="button"
                          onClick={handleCopyRedirectUri}
                          className="interactive-btn h-8 px-3.5 rounded-md bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedRedirect ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.2] animate-check-pop" />
                              <span>복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
                              <span>복사</span>
                            </>
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Client ID 입력 */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-client-id"
                      className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                    >
                      2. Client ID
                    </label>
                    <input
                      id="input-client-id"
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="32자리 Client ID 입력"
                      className="w-full h-10 px-3.5 rounded-lg text-sm font-mono bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-spotify/40 focus:border-spotify transition-all select-all"
                    />
                  </div>

                  {/* Client Secret 입력 */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-client-secret"
                      className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                    >
                      3. Client Secret
                    </label>
                    <div className="relative">
                      <input
                        id="input-client-secret"
                        type={showSecret ? 'text' : 'password'}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="32자리 Client Secret 입력"
                        className="w-full h-10 pl-3.5 pr-10 rounded-lg text-sm font-mono bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-spotify/40 focus:border-spotify transition-all select-all"
                      />
                      <Tooltip
                        content={showSecret ? '비밀번호 숨기기' : '비밀번호 표시'}
                        side="top"
                      >
                        <button
                          type="button"
                          onClick={() => setShowSecret((prev) => !prev)}
                          aria-label="시크릿 표시 전환"
                          className="interactive-btn absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-spotify"
                        >
                          {showSecret ? (
                            <EyeOff className="w-4 h-4 stroke-[1.75]" />
                          ) : (
                            <Eye className="w-4 h-4 stroke-[1.75]" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {step1Error && (
                    <div className="animate-toast-slide p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 stroke-[1.75]" />
                      <span>{step1Error}</span>
                    </div>
                  )}
                </div>

                {/* 우측: 설정 순서 요약 카드 */}
                <div className="interactive-card lg:col-span-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-start space-y-4 shadow-2xs">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
                        대시보드 설정 순서
                      </h3>
                    </div>

                    <ol className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300 stagger-list">
                      <li className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                          1. 앱 생성 시 Web API 체크 및 Redirect URI 등록
                        </p>
                        <p className="leading-relaxed">
                          앱 생성 시 <strong className="text-spotify font-medium">Which API/SDKs are you planning to use?</strong> 질문에서 <strong className="text-spotify font-medium">Web API</strong> 항목에 반드시 체크하고, Redirect URIs 항목에{' '}
                          <code className="font-mono text-spotify font-medium">
                            {DEFAULT_REDIRECT_URI}
                          </code>
                          를 추가한 후 하단 저장(Save)을 누릅니다.
                        </p>
                      </li>

                      <li className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                          2. 계정 이메일 등록 (User Management)
                        </p>
                        <p className="leading-relaxed">
                          앱 설정의 User Management 메뉴에서 사용할 기존 계정과 새
                          계정의 이메일을 등록해 주세요.
                        </p>
                      </li>

                      <li className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                          3. Client ID 및 Secret 복사 후 입력
                        </p>
                        <p className="leading-relaxed">
                          발급된 Client ID와 Secret을 좌측 입력란에 붙여넣고
                          다음 단계로 이동합니다.
                        </p>
                      </li>
                    </ol>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHelpDrawerOpen(true)}
                    className="interactive-btn w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-spotify/50 flex items-center justify-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                    <span>사용 가이드 및 체크리스트 (F1)</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================== */}
          {/* STEP 2: 기본 브라우저 계정 연동 (자동완성·캡차 프리 + 세션 전환) */}
          {/* ========================================================== */}
          {currentStep === 1 && (
            <section
              key="step-1"
              data-od-id="step-2-accounts"
              className="cascade-cards relative z-10 max-w-5xl w-full mx-auto flex flex-col justify-start gap-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 shrink-0">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    작업 모드 및 계정 연결
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    원하시는 작업 방식을 선택하고 계정 또는 백업 데이터를 연결해 주세요.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip content="연동된 모든 계정 로그인 세션 초기화" side="bottom">
                    <button
                      type="button"
                      onClick={handleClearSessions}
                      className="interactive-btn h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/40 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                      <span>연결 초기화</span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* 4가지 작업 방식 선택지 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'account_to_account' as const,
                    num: '1',
                    title: '계정 > 계정 전송',
                    desc: '기존 계정에서 새 계정으로 바로 전송',
                  },
                  {
                    id: 'backup_to_account' as const,
                    num: '2',
                    title: '백업 파일 > 계정 전송',
                    desc: '앱 백업 파일(JSON)에서 계정으로 복원',
                  },
                  {
                    id: 'create_backup' as const,
                    num: '3',
                    title: '백업 파일(JSON) 생성',
                    desc: '계정 데이터를 앱 백업 폴더에 보관',
                  },
                  {
                    id: 'delete_account_data' as const,
                    num: '4',
                    title: '계정 데이터 삭제',
                    desc: '계정의 플레이리스트와 음악 라이브러리 정리',
                  },
                ].map((opt) => {
                  const isSelected = workflowMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectWorkflowMode(opt.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 shadow-2xs ${
                        isSelected
                          ? 'bg-spotify/10 border-spotify dark:bg-spotify/15 text-zinc-950 dark:text-zinc-100 ring-1 ring-spotify'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${
                            isSelected
                              ? 'bg-spotify text-spotify-fg'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {opt.num}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-semibold text-spotify">선택됨</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-950 dark:text-zinc-100">{opt.title}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 인증 오류 안내 배너 */}
              {authError && (
                <div className="animate-toast-slide p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 stroke-[1.75]" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                        {authError.target === 'src'
                          ? workflowMode === 'create_backup'
                            ? '백업할 계정'
                            : workflowMode === 'delete_account_data'
                            ? '정리할 계정'
                            : workflowMode === 'backup_to_account'
                            ? '백업 파일'
                            : '가져올 계정'
                          : '새 계정'}{' '}
                        연결 오류: {authError.message}
                      </p>
                      {authError.is403 && (
                        <div className="text-xs text-zinc-800 dark:text-zinc-200 space-y-1 pt-1">
                          <p className="font-medium">
                            Spotify 앱의 [User Management]에 해당 계정의 이메일이 등록되지 않았습니다.
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            대시보드 → 앱 선택 → Settings → User Management 탭에서
                            로그인하려는 계정의 이름과 이메일을 추가해 주세요.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenExternal(
                                'https://developer.spotify.com/dashboard'
                              )
                            }
                            className="interactive-btn mt-1.5 h-7 px-3 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
                          >
                            <span>Dashboard 열기</span>
                            <ExternalLink className="w-3 h-3 stroke-[1.75]" />
                          </button>
                        </div>
                      )}
                      {authError.is429 && (
                        <div className="text-xs text-zinc-800 dark:text-zinc-200 space-y-2 pt-2 border-t border-rose-500/20">
                          <p className="font-semibold text-rose-600 dark:text-rose-300">
                            스포티파이 개발자 모드 호출 한도 초과 (Rate Limit Quota Exceeded)
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            Spotify 개발자 정책상 등록된 App(Client ID)의 단시간 API 요청량이 초과되면 일정 시간 동안 해당 App의 모든 호출이 일시 차단됩니다.
                          </p>
                          <div className="p-3 rounded-lg bg-white/60 dark:bg-zinc-900/60 border border-rose-500/20 space-y-1.5">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              ⚡ 가장 빠른 해결 방법 (즉시 사용 권장):
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              Spotify Developer Dashboard에서 <strong className="text-spotify">새 앱(Create App)</strong>을 생성하신 후, 새로 발급된 Client ID와 Secret을 1단계에 입력하시면 대기 없이 즉시 로그인할 수 있습니다. (기존 앱은 몇 시간 후 자동 복구됩니다)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setAuthError(null);
                                navigateToStep(0);
                              }}
                              className="interactive-btn h-8 px-3 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                            >
                              <span>1단계(API 설정)로 이동하여 새 키 입력</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenExternal(
                                  'https://developer.spotify.com/dashboard'
                                )
                              }
                              className="interactive-btn h-8 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-1.5"
                            >
                              <span>Spotify Dashboard 열기</span>
                              <ExternalLink className="w-3 h-3 stroke-[1.75]" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 모드별 좌/우 카드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 cascade-cards">
                {/* [좌측 카드]: 모드 2일 때는 백업 파일 선택기, 그 외(1, 3, 4)는 계정 로그인 카드 */}
                {workflowMode === 'backup_to_account' ? (
                  <div className="interactive-card rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-spotify-soft text-spotify">
                            백업 파일 보관함
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">backups/</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tooltip content="백업 디렉토리 열기" side="top">
                            <button
                              type="button"
                              onClick={handleOpenBackupsFolder}
                              aria-label="백업 디렉토리 열기"
                              className="interactive-btn h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:border-spotify/50 flex items-center gap-1"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                              <span>폴더 열기</span>
                            </button>
                          </Tooltip>
                          <Tooltip content="목록 새로고침" side="top">
                            <button
                              type="button"
                              onClick={refreshAppBackups}
                              aria-label="목록 새로고침"
                              className="interactive-btn h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:text-spotify flex items-center justify-center"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 stroke-[1.75] ${
                                  isLoadingBackups ? 'animate-spin text-spotify' : ''
                                }`}
                              />
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      {/* 시각화된 백업 파일 목록 */}
                      {isLoadingBackups ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500">
                          <Loader2 className="w-5 h-5 animate-spin text-spotify" />
                          <span>백업 파일 검색 중...</span>
                        </div>
                      ) : appBackups.length === 0 ? (
                        <div className="py-8 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
                          <HardDrive className="w-8 h-8 text-zinc-400 mx-auto stroke-[1.5]" />
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            저장된 백업 파일이 없습니다
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            앱 하위 <code className="font-mono text-spotify">backups/</code> 폴더에 파일을 넣거나 아래에서 외부 파일을 찾아보세요.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                          {appBackups.map((b) => {
                            const isSelected = selectedBackupFilename === b.filename;
                            const formattedDate = new Date(b.createdAt).toLocaleString();
                            const sizeKb = Math.round(b.sizeBytes / 1024);
                            return (
                              <button
                                key={b.filename}
                                type="button"
                                onClick={() => handleSelectAppBackup(b)}
                                className={`w-full p-3 rounded-xl border text-left transition-all space-y-1.5 ${
                                  isSelected
                                    ? 'border-spotify bg-spotify/10 dark:bg-spotify/15 ring-1 ring-spotify'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-950/70'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                    {b.filename}
                                  </p>
                                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                                    {sizeKb > 1024
                                      ? `${(sizeKb / 1024).toFixed(1)}MB`
                                      : `${sizeKb}KB`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                                  {b.sourceUserName && (
                                    <span className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 font-medium">
                                      {b.sourceUserName}
                                    </span>
                                  )}
                                  <span className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                    플리 {b.playlistsCount}개
                                  </span>
                                  <span className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                    좋아요 {b.likedTracksCount}곡
                                  </span>
                                  <span className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                    앨범 {b.savedAlbumsCount}개
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  {formattedDate}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <Tooltip content="내 컴퓨터에서 다른 백업 파일 선택" side="top">
                        <button
                          type="button"
                          onClick={handlePickExternalBackup}
                          className="interactive-btn w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-spotify/50 flex items-center justify-center gap-1.5"
                        >
                          <FolderUp className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                          <span>외부 백업 파일(JSON) 찾아보기</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ) : (
                  /* 1, 3, 4번 모드의 원본/정리 계정 로그인 카드 (실제 스포티파이 계정 로그인 필수) */
                  (() => {
                    const isLiveSourceConnected = Boolean(srcToken && srcUser);
                    return (
                      <div className="interactive-card rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-5 shadow-2xs">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-spotify-soft text-spotify">
                              {workflowMode === 'create_backup'
                                ? '백업 대상 계정'
                                : workflowMode === 'delete_account_data'
                                ? '정리 대상 계정'
                                : '가져올 계정 (기존 계정)'}
                            </span>
                            {isLiveSourceConnected && (
                              <span className="animate-badge-pop inline-flex items-center gap-1 text-xs font-semibold text-spotify">
                                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                                <span>연결 완료</span>
                              </span>
                            )}
                          </div>

                          {isLiveSourceConnected && srcUser ? (
                            <div className="animate-tab-panel p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-full bg-spotify-soft text-spotify border border-spotify/30 flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                                  {srcUser.images?.[0]?.url ? (
                                    <img
                                      src={srcUser.images[0].url}
                                      alt={srcUser.display_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    srcUser.display_name.slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-base font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                    {srcUser.display_name}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
                                    {srcUser.email || srcUser.id}
                                  </p>
                                </div>
                              </div>

                              {srcSummary && (
                                <div className="grid grid-cols-5 gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 text-center stagger-list">
                                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">좋아요</p>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                      <AnimatedNumber value={srcSummary.likedSongsTotal} />
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">앨범</p>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                      <AnimatedNumber value={srcSummary.savedAlbumsTotal} />
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">아티스트</p>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                      <AnimatedNumber value={srcSummary.followedArtistsTotal} />
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">팟캐스트</p>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                      <AnimatedNumber value={srcSummary.savedShowsTotal ?? 0} />
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">플리</p>
                                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                      <AnimatedNumber value={srcSummary.playlistsTotal} />
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-8 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
                              <UserCheck className="w-8 h-8 text-spotify mx-auto stroke-[1.6]" />
                              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {workflowMode === 'create_backup'
                                  ? '백업할 계정에 로그인해 주세요'
                                  : workflowMode === 'delete_account_data'
                                  ? '데이터를 정리할 계정에 로그인해 주세요'
                                  : '음악을 가져올 기존 계정에 로그인해 주세요'}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                버튼을 누르면 인터넷 브라우저 창에서 안전하게 로그인됩니다.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {authLoadingTarget === 'src' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-11 px-4 rounded-xl bg-spotify-soft border border-spotify/40 text-spotify text-sm font-semibold flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.2]" />
                                  <span>브라우저에서 로그인 중...</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCancelAuthWait}
                                  className="interactive-btn h-11 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                >
                                  취소
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                                <span>브라우저 창이 안 뜨나요?</span>
                                <Tooltip
                                  content={
                                    copiedAuthUrlTarget === 'src'
                                      ? '복사 완료!'
                                      : '브라우저 로그인 링크 클립보드 복사'
                                  }
                                  side="top"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleCopyAuthUrl('src')}
                                    className="text-spotify hover:underline font-medium"
                                  >
                                    {copiedAuthUrlTarget === 'src' ? '링크 복사됨!' : '로그인 링크 복사'}
                                  </button>
                                </Tooltip>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={authLoadingTarget !== null}
                              onClick={() =>
                                handleAuthenticateAccount('src', {
                                  switchAccount: isLiveSourceConnected,
                                  openMode: 'default_browser',
                                })
                              }
                              className="interactive-btn btn-shimmer w-full h-11 px-4 rounded-xl bg-spotify hover:bg-spotify-hover disabled:opacity-40 text-spotify-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-xs"
                            >
                              {isLiveSourceConnected ? (
                                <>
                                  <RefreshCw className="w-4 h-4 stroke-[2]" />
                                  <span>다른 계정으로 변경</span>
                                </>
                              ) : (
                                <>
                                  <LogIn className="w-4 h-4 stroke-[2]" />
                                  <span>스포티파이 로그인</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* [우측 카드]: 모드 1, 2는 새 계정 로그인 카드, 모드 3은 백업 폴더 안내 카드, 모드 4는 주의사항 카드 */}
                {workflowMode === 'create_backup' ? (
                  <div className="interactive-card rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-5 shadow-2xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-spotify-soft text-spotify">
                          백업 파일 저장소
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">backups/</span>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-spotify stroke-[1.75]" />
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                            앱 설치 디렉토리 하위 저장
                          </p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          백업 파일은 설치 프로그램 경로의 <code className="font-mono text-spotify">backups/</code> 폴더에 생성일시와 함께 안전하게 JSON 형식으로 저장됩니다.
                        </p>
                        <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all select-all">
                          {backupsDirectoryPath || 'backups'}
                        </div>
                      </div>
                    </div>
                    <Tooltip content="백업 파일이 저장되는 로컬 폴더 열기" side="top">
                      <button
                        type="button"
                        onClick={handleOpenBackupsFolder}
                        className="interactive-btn w-full h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4 text-spotify stroke-[1.75]" />
                        <span>백업 저장 폴더 열기</span>
                      </button>
                    </Tooltip>
                  </div>
                ) : workflowMode === 'delete_account_data' ? (
                  <div className="interactive-card rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-5 shadow-2xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          데이터 정리 주의사항
                        </span>
                        <AlertTriangle className="w-4 h-4 text-rose-500 stroke-[1.75]" />
                      </div>
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                          복구 불가능한 영구 삭제 안내
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          로그인한 계정의 플레이리스트 언팔로우/삭제, 좋아요한 곡 및 앨범 저장 취소, 팔로우 아티스트 및 팟캐스트 정리를 수행합니다.
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          다음 단계에서 삭제할 카테고리와 항목을 세부적으로 지정할 수 있으며, 삭제 전 <strong className="text-spotify">3번 모드(백업 파일 생성)</strong>를 통해 데이터를 백업해 두시기를 권장합니다.
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 text-center">
                      다음 단계에서 정리할 대상 항목을 직접 선택할 수 있습니다.
                    </div>
                  </div>
                ) : (
                  /* 1번, 2번 모드의 받을 새 계정 카드 */
                  <div className="interactive-card rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-5 shadow-2xs">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-spotify-soft text-spotify">
                          받을 계정 (새 계정)
                        </span>
                        {dstUser && (
                          <span className="animate-badge-pop inline-flex items-center gap-1 text-xs font-semibold text-spotify">
                            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                            <span>연결 완료</span>
                          </span>
                        )}
                      </div>

                      {dstUser ? (
                        <div className="animate-tab-panel p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-spotify-soft text-spotify border border-spotify/30 flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                              {dstUser.images?.[0]?.url ? (
                                <img
                                  src={dstUser.images[0].url}
                                  alt={dstUser.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                dstUser.display_name.slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                {dstUser.display_name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
                                {dstUser.email || dstUser.id}
                              </p>
                            </div>
                          </div>

                          {dstSummary && (
                            <div className="grid grid-cols-5 gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 text-center stagger-list">
                              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">좋아요</p>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                  <AnimatedNumber value={dstSummary.likedSongsTotal} />
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">앨범</p>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                  <AnimatedNumber value={dstSummary.savedAlbumsTotal} />
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">아티스트</p>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                  <AnimatedNumber value={dstSummary.followedArtistsTotal} />
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">팟캐스트</p>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                  <AnimatedNumber value={dstSummary.savedShowsTotal ?? 0} />
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">플리</p>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                                  <AnimatedNumber value={dstSummary.playlistsTotal} />
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
                          <UserPlus className="w-8 h-8 text-spotify mx-auto stroke-[1.6]" />
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            음악을 옮겨받을 새 계정에 로그인해 주세요
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            기존 계정과 다른 새 계정의 아이디로 로그인하시면 됩니다.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {authLoadingTarget === 'dst' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-11 px-4 rounded-xl bg-spotify-soft border border-spotify/40 text-spotify text-sm font-semibold flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin stroke-[2.2]" />
                              <span>브라우저에서 로그인 중...</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCancelAuthWait}
                              className="interactive-btn h-11 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            >
                              취소
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                            <span>브라우저 창이 안 뜨나요?</span>
                            <Tooltip
                              content={
                                copiedAuthUrlTarget === 'dst'
                                  ? '복사 완료!'
                                  : '브라우저 로그인 링크 클립보드 복사'
                              }
                              side="top"
                            >
                              <button
                                type="button"
                                onClick={() => handleCopyAuthUrl('dst')}
                                className="text-spotify hover:underline font-medium"
                              >
                                {copiedAuthUrlTarget === 'dst' ? '링크 복사됨!' : '로그인 링크 복사'}
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={authLoadingTarget !== null}
                          onClick={() =>
                            handleAuthenticateAccount('dst', {
                              switchAccount: true,
                              openMode: 'default_browser',
                            })
                          }
                          className="interactive-btn btn-shimmer w-full h-11 px-4 rounded-xl bg-spotify hover:bg-spotify-hover disabled:opacity-40 text-spotify-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-xs"
                        >
                          {dstUser ? (
                            <>
                              <RefreshCw className="w-4 h-4 stroke-[2]" />
                              <span>다른 계정으로 변경</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 stroke-[2]" />
                              <span>새 계정 로그인</span>
                            </>
                          )}
                        </button>
                      )}

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-1">
                        새로 사용할 Spotify 계정으로 로그인해 주세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ========================================================== */}
          {/* STEP 3: 5대 카테고리 개별 항목 선택 및 백업 */}
          {/* ========================================================== */}
          {currentStep === 2 && (
            <section
              key="step-2"
              data-od-id="step-3-selection"
              className="cascade-cards relative z-10 max-w-5xl w-full mx-auto flex-1 min-h-0 flex flex-col justify-start gap-3"
            >
              {/* 상단 헤더 */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    {workflowMode === 'create_backup'
                      ? '백업할 항목 선택'
                      : workflowMode === 'delete_account_data'
                      ? '삭제할 항목 선택'
                      : workflowMode === 'backup_to_account'
                      ? '복원할 항목 선택'
                      : '옮길 항목 선택'}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {workflowMode === 'create_backup'
                      ? '백업 파일로 저장할 플레이리스트와 보관함 음악을 선택해 주세요.'
                      : workflowMode === 'delete_account_data'
                      ? '계정에서 정리 및 삭제할 플레이리스트와 보관함 음악을 선택해 주세요.'
                      : workflowMode === 'backup_to_account'
                      ? '백업 파일에서 대상 계정으로 복원할 플레이리스트와 보관함 음악을 선택해 주세요.'
                      : '새 계정으로 이전할 플레이리스트와 보관함 음악을 선택해 주세요.'}{' '}
                    총 선택:{' '}
                    <strong className="font-mono text-spotify font-semibold">
                      <AnimatedNumber value={estimatedTotalItems} />
                    </strong>
                    개
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {quickSelectFeedback && (
                    <span
                      ref={toastRef}
                      key={quickSelectFeedback.key}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-spotify-soft text-spotify border border-spotify/30"
                    >
                      {quickSelectFeedback.text}
                    </span>
                  )}
                </div>
              </div>

              {/* 1. 5대 카테고리 탭 카드 (클릭 시 아래 상세 목록 전환 + 우측 체크박스로 전체 토글) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0 stagger-list">
                {(
                  [
                    {
                      id: 'playlists' as SelectionCategoryTab,
                      label: '플레이리스트',
                      icon: ListMusic,
                      selectedCount: selectedPlaylistsCount,
                      totalCount: playlists.length,
                      unit: '개',
                      isLoading: false,
                    },
                    {
                      id: 'liked_songs' as SelectionCategoryTab,
                      label: '좋아요한 곡',
                      icon: Heart,
                      selectedCount: selectedLikedCount,
                      totalCount: totalLikedCount,
                      unit: '곡',
                      isLoading: isLoadingLiked,
                    },
                    {
                      id: 'saved_albums' as SelectionCategoryTab,
                      label: '저장한 앨범',
                      icon: Disc,
                      selectedCount: selectedAlbumsCount,
                      totalCount: totalAlbumsCount,
                      unit: '개',
                      isLoading: isLoadingAlbums,
                    },
                    {
                      id: 'followed_artists' as SelectionCategoryTab,
                      label: '팔로우 아티스트',
                      icon: Users,
                      selectedCount: selectedArtistsCount,
                      totalCount: totalArtistsCount,
                      unit: '명',
                      isLoading: isLoadingArtists,
                    },
                    {
                      id: 'saved_shows' as SelectionCategoryTab,
                      label: '팟캐스트',
                      icon: Mic2,
                      selectedCount: selectedShowsCount,
                      totalCount: totalShowsCount,
                      unit: '개',
                      isLoading: isLoadingShows,
                    },
                  ]
                ).map((cat) => {
                  const IconComp = cat.icon;
                  const isActiveTab = activeCategoryTab === cat.id;
                  const isChecked = cat.selectedCount > 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleSelectCategoryTab(cat.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectCategoryTab(cat.id);
                        }
                      }}
                      className={`interactive-card p-3 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2 ${
                        isActiveTab
                          ? 'bg-white dark:bg-zinc-900 border-spotify ring-1 ring-spotify/30 shadow-xs'
                          : isChecked
                          ? 'bg-white/90 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-spotify/50'
                          : 'bg-zinc-50/60 dark:bg-zinc-950 border-zinc-200/70 dark:border-zinc-800/60 opacity-60 hover:opacity-95'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                            isActiveTab
                              ? 'bg-spotify text-spotify-fg scale-105'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5 stroke-[1.8]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                            {cat.label}
                          </p>
                          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                            <span>
                              <AnimatedNumber value={cat.selectedCount} /> /{' '}
                              {cat.totalCount.toLocaleString()}
                              {cat.unit}
                            </span>
                            {cat.isLoading && (
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-spotify shrink-0" />
                            )}
                          </p>
                        </div>
                      </div>

                      <Tooltip content={`${cat.label} 전체 선택/해제`} side="top">
                        <button
                          type="button"
                          onClick={(e) => handleToggleWholeCategory(cat.id, e)}
                          aria-label={`${cat.label} 전체 선택/해제`}
                          className="interactive-btn p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare
                              key={`cat-check-${cat.id}`}
                              className="w-4 h-4 text-spotify stroke-[2.2] animate-check-pop"
                            />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400 stroke-[1.75]" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>

              {/* 2. 중복 방지 및 순서 옵션 바 / 삭제 옵션 바 */}
              {workflowMode === 'delete_account_data' ? (
                <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                      <span>삭제 옵션</span>
                    </div>

                    <ShadcnSwitch
                      checked={backupBeforeDelete}
                      onChange={(val) => setBackupBeforeDelete(val)}
                      label="삭제 전 JSON 백업 파일 자동 생성 및 보존 (권장)"
                    />

                    <Tooltip content="계정 데이터 삭제" side="top">
                      <button
                        type="button"
                        onClick={() => setIsCleanerModalOpen(true)}
                        className="interactive-btn text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline ml-1"
                        aria-label="계정 데이터 삭제"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2]" />
                        <span>계정 데이터 삭제</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    삭제 진행 전 대상 데이터를 앱 backups/ 폴더에 안전하게 백업합니다.
                  </div>
                </div>
              ) : workflowMode === 'create_backup' ? (
                <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-spotify">
                    <HardDrive className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>백업 파일 생성 안내</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    선택한 보관함 항목들이 하나의 JSON 아카이브 파일로 생성되어 앱 backups/ 폴더에 저장됩니다.
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                      <span>전송 옵션</span>
                    </div>

                    <ShadcnSwitch
                      checked={migrationConfig.skipDuplicateLibraryItems}
                      onChange={(val) =>
                        setMigrationConfig((prev) => ({
                          ...prev,
                          skipDuplicateLibraryItems: val,
                        }))
                      }
                      label="보관함 중복 건너뛰기"
                    />

                    <ShadcnSwitch
                      checked={migrationConfig.preserveLikedOrder}
                      onChange={(val) =>
                        setMigrationConfig((prev) => ({
                          ...prev,
                          preserveLikedOrder: val,
                        }))
                      }
                      label="좋아요 등록 순서 보존"
                    />

                    <ShadcnSwitch
                      checked={Boolean(migrationConfig.wipeDestinationBeforeMigration)}
                      onChange={(val) => {
                        if (val) {
                          const confirmed = window.confirm(
                            '⚠️ 주의: 도착 계정의 기존 데이터 삭제를 활성화하면, 전송 시작 전 도착 계정에 이미 저장되어 있던 플레이리스트 및 보관함 항목이 영구 삭제됩니다. 계속 진행하시겠습니까?'
                          );
                          if (!confirmed) return;
                        }
                        setMigrationConfig((prev) => ({
                          ...prev,
                          wipeDestinationBeforeMigration: val,
                        }));
                      }}
                      label="도착 계정 데이터 삭제 후 전송"
                    />

                    <Tooltip content="계정 데이터 삭제" side="top">
                      <button
                        type="button"
                        onClick={() => setIsCleanerModalOpen(true)}
                        className="interactive-btn text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline ml-1"
                        aria-label="계정 데이터 삭제"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2]" />
                        <span>계정 데이터 삭제</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 mr-1">
                      동일 플레이리스트:
                    </span>
                    <div className="inline-flex p-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      {(
                        [
                          {
                            mode: 'merge' as PlaylistDuplicateMode,
                            label: '누락 곡 병합',
                            tooltip: '대상 계정에 있는 플레이리스트에 누락된 곡만 추가합니다',
                          },
                          {
                            mode: 'create_new' as PlaylistDuplicateMode,
                            label: '새로 생성',
                            tooltip: '동일한 이름이 있어도 새 플레이리스트를 별도 생성합니다',
                          },
                          {
                            mode: 'skip_existing' as PlaylistDuplicateMode,
                            label: '건너뛰기',
                            tooltip: '이미 존재하는 플레이리스트는 이전하지 않고 건너뜁니다',
                          },
                        ]
                      ).map((item) => (
                        <Tooltip key={item.mode} content={item.tooltip} side="top">
                          <button
                            type="button"
                            onClick={() =>
                              setMigrationConfig((prev) => ({
                                ...prev,
                                playlistDuplicateMode: item.mode,
                              }))
                            }
                            className={`interactive-btn px-2.5 py-1 rounded-md text-xs font-semibold ${
                              migrationConfig.playlistDuplicateMode === item.mode
                                ? 'bg-spotify text-spotify-fg shadow-2xs'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 선택된 카테고리의 상세 항목 리스트 박스 (중간에 잘리지 않고 칸 전체를 꽉 채우도록 flex-1 min-h-0 적용) */}
              <div className="flex-1 min-h-[260px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xs">
                {/* 상단 1열: 카테고리 제목 + 검색 + 보기 필터 + 정렬 */}
                <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 bg-zinc-50/80 dark:bg-zinc-950/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                      {activeCategoryTab === 'playlists' &&
                        `플레이리스트 목록 (${selectedPlaylistsCount} / ${playlists.length}개 선택)`}
                      {activeCategoryTab === 'liked_songs' &&
                        `좋아요 표시한 곡 목록 (${selectedLikedCount} / ${totalLikedCount}곡 선택)`}
                      {activeCategoryTab === 'saved_albums' &&
                        `저장한 앨범 목록 (${selectedAlbumsCount} / ${totalAlbumsCount}개 선택)`}
                      {activeCategoryTab === 'followed_artists' &&
                        `팔로우한 아티스트 목록 (${selectedArtistsCount} / ${totalArtistsCount}명 선택)`}
                      {activeCategoryTab === 'saved_shows' &&
                        `팔로우한 팟캐스트 목록 (${selectedShowsCount} / ${totalShowsCount}개 선택)`}
                    </span>
                    {activeCategoryTab === 'liked_songs' && isLoadingLiked && (
                      <span className="text-[11px] font-mono text-spotify flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>
                          불러오는 중 ({likedLoadProgress.loaded}/
                          {likedLoadProgress.total || srcSummary?.likedSongsTotal || 0})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 실시간 검색 입력창 */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder={
                          activeCategoryTab === 'playlists'
                            ? '플레이리스트, 소유자 검색...'
                            : activeCategoryTab === 'liked_songs'
                            ? '곡 제목, 아티스트, 앨범 검색...'
                            : activeCategoryTab === 'saved_albums'
                            ? '앨범명, 아티스트 검색...'
                            : activeCategoryTab === 'followed_artists'
                            ? '아티스트명, 장르 검색...'
                            : '팟캐스트, 제작사 검색...'
                        }
                        className="h-7 w-44 sm:w-52 pl-8 pr-2.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-spotify"
                      />
                    </div>

                    {/* 보기 필터 탭 */}
                    <div className="inline-flex p-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      {(activeCategoryTab === 'playlists'
                        ? ([
                            { id: 'all', label: '전체' },
                            {
                              id: 'mine',
                              label: `내 소유 (${myOwnedPlaylistsCount})`,
                            },
                            {
                              id: 'external',
                              label: `외부 팔로우 (${externalPlaylistsCount})`,
                            },
                            { id: 'selected', label: '선택됨' },
                            { id: 'unselected', label: '미선택' },
                          ] as Array<{ id: ItemViewFilter; label: string }>)
                        : ([
                            { id: 'all', label: '전체' },
                            { id: 'selected', label: '선택됨' },
                            { id: 'unselected', label: '미선택' },
                          ] as Array<{ id: ItemViewFilter; label: string }>)
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setViewFilter(tab.id)}
                          className={`interactive-btn px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            viewFilter === tab.id
                              ? 'bg-spotify text-spotify-fg shadow-2xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* 정렬 토글 버튼 */}
                    <Tooltip content="목록 정렬 기준 변경" side="top">
                      <button
                        type="button"
                        onClick={() => {
                          const order: ItemSortMode[] = [
                            'default',
                            'name_asc',
                            'count_desc',
                            'count_asc',
                          ];
                          const nextIdx =
                            (order.indexOf(sortMode) + 1) % order.length;
                          setSortMode(order[nextIdx]);
                        }}
                        className="interactive-btn h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 hover:border-spotify/50 flex items-center gap-1"
                      >
                        <ArrowUpDown className="w-3 h-3 text-spotify stroke-[1.75]" />
                        <span>
                          {sortMode === 'default'
                            ? '기본순'
                            : sortMode === 'name_asc'
                            ? '이름순'
                            : sortMode === 'count_desc'
                            ? activeCategoryTab === 'liked_songs'
                              ? '길이 긴 순'
                              : activeCategoryTab === 'followed_artists'
                              ? '팔로워순'
                              : '수록곡 많은 순'
                            : activeCategoryTab === 'liked_songs'
                            ? '오래된 순'
                            : '수록곡 적은 순'}
                        </span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* 상단 2열: 전체 선택 / 전체 해제 액션 바 */}
                <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30 flex items-center justify-between gap-2 shrink-0">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {activeCategoryTab === 'playlists' &&
                      `${filteredPlaylists.filter((p) => p.selected).length} / ${filteredPlaylists.length}개 선택됨`}
                    {activeCategoryTab === 'liked_songs' &&
                      `${filteredLikedTracks.filter((t) => t.selected !== false).length} / ${filteredLikedTracks.length}곡 선택됨`}
                    {activeCategoryTab === 'saved_albums' &&
                      `${filteredSavedAlbums.filter((al) => al.selected !== false).length} / ${filteredSavedAlbums.length}개 선택됨`}
                    {activeCategoryTab === 'followed_artists' &&
                      `${filteredFollowedArtists.filter((ar) => ar.selected !== false).length} / ${filteredFollowedArtists.length}명 선택됨`}
                    {activeCategoryTab === 'saved_shows' &&
                      `${filteredSavedShows.filter((sh) => sh.selected !== false).length} / ${filteredSavedShows.length}개 선택됨`}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tooltip content="현재 표시된 목록 전체 선택" side="top">
                      <button
                        type="button"
                        onClick={() => {
                        if (activeCategoryTab === 'playlists') {
                          const targetIds = new Set(
                            filteredPlaylists.map((p) => p.id)
                          );
                          setPlaylists((prev) =>
                            prev.map((p) =>
                              targetIds.has(p.id) ? { ...p, selected: true } : p
                            )
                          );
                        } else if (activeCategoryTab === 'liked_songs') {
                          setMigrationConfig((prev) => ({
                            ...prev,
                            includeLikedSongs: true,
                          }));
                          const targetIds = new Set(
                            filteredLikedTracks.map((t) => t.id)
                          );
                          setLikedTracks((prev) =>
                            prev.map((t) =>
                              targetIds.has(t.id) ? { ...t, selected: true } : t
                            )
                          );
                        } else if (activeCategoryTab === 'saved_albums') {
                          setMigrationConfig((prev) => ({
                            ...prev,
                            includeSavedAlbums: true,
                          }));
                          const targetIds = new Set(
                            filteredSavedAlbums.map((al) => al.id)
                          );
                          setSavedAlbums((prev) =>
                            prev.map((al) =>
                              targetIds.has(al.id) ? { ...al, selected: true } : al
                            )
                          );
                        } else if (activeCategoryTab === 'followed_artists') {
                          setMigrationConfig((prev) => ({
                            ...prev,
                            includeFollowedArtists: true,
                          }));
                          const targetIds = new Set(
                            filteredFollowedArtists.map((ar) => ar.id)
                          );
                          setFollowedArtists((prev) =>
                            prev.map((ar) =>
                              targetIds.has(ar.id) ? { ...ar, selected: true } : ar
                            )
                          );
                        } else if (activeCategoryTab === 'saved_shows') {
                          setMigrationConfig((prev) => ({
                            ...prev,
                            includeSavedShows: true,
                          }));
                          const targetIds = new Set(
                            filteredSavedShows.map((sh) => sh.id)
                          );
                          setSavedShows((prev) =>
                            prev.map((sh) =>
                              targetIds.has(sh.id) ? { ...sh, selected: true } : sh
                            )
                          );
                        }
                        triggerQuickFeedback('현재 목록 전체 선택 완료');
                      }}
                      className="interactive-btn h-7 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-spotify/50 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      전체 선택
                    </button>
                  </Tooltip>

                  <Tooltip content="현재 표시된 목록 전체 해제" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeCategoryTab === 'playlists') {
                          const targetIds = new Set(
                            filteredPlaylists.map((p) => p.id)
                          );
                          setPlaylists((prev) =>
                            prev.map((p) =>
                              targetIds.has(p.id) ? { ...p, selected: false } : p
                            )
                          );
                        } else if (activeCategoryTab === 'liked_songs') {
                          const targetIds = new Set(
                            filteredLikedTracks.map((t) => t.id)
                          );
                          setLikedTracks((prev) => {
                            const updated = prev.map((t) =>
                              targetIds.has(t.id) ? { ...t, selected: false } : t
                            );
                            const anySelected = updated.some(
                              (t) => t.selected !== false
                            );
                            setMigrationConfig((cfg) => ({
                              ...cfg,
                              includeLikedSongs: anySelected,
                            }));
                            return updated;
                          });
                        } else if (activeCategoryTab === 'saved_albums') {
                          const targetIds = new Set(
                            filteredSavedAlbums.map((al) => al.id)
                          );
                          setSavedAlbums((prev) => {
                            const updated = prev.map((al) =>
                              targetIds.has(al.id) ? { ...al, selected: false } : al
                            );
                            const anySelected = updated.some(
                              (al) => al.selected !== false
                            );
                            setMigrationConfig((cfg) => ({
                              ...cfg,
                              includeSavedAlbums: anySelected,
                            }));
                            return updated;
                          });
                        } else if (activeCategoryTab === 'followed_artists') {
                          const targetIds = new Set(
                            filteredFollowedArtists.map((ar) => ar.id)
                          );
                          setFollowedArtists((prev) => {
                            const updated = prev.map((ar) =>
                              targetIds.has(ar.id) ? { ...ar, selected: false } : ar
                            );
                            const anySelected = updated.some(
                              (ar) => ar.selected !== false
                            );
                            setMigrationConfig((cfg) => ({
                              ...cfg,
                              includeFollowedArtists: anySelected,
                            }));
                            return updated;
                          });
                        } else if (activeCategoryTab === 'saved_shows') {
                          const targetIds = new Set(
                            filteredSavedShows.map((sh) => sh.id)
                          );
                          setSavedShows((prev) => {
                            const updated = prev.map((sh) =>
                              targetIds.has(sh.id) ? { ...sh, selected: false } : sh
                            );
                            const anySelected = updated.some(
                              (sh) => sh.selected !== false
                            );
                            setMigrationConfig((cfg) => ({
                              ...cfg,
                              includeSavedShows: anySelected,
                            }));
                            return updated;
                          });
                        }
                        triggerQuickFeedback('현재 목록 전체 해제 완료');
                      }}
                      className="interactive-btn h-7 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-spotify/50 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      전체 해제
                    </button>
                  </Tooltip>
                  </div>
                </div>

                {/* 본문 스크롤 리스트: max-h 제한 없이 flex-1 min-h-0으로 카드 하단까지 100% 채우며 GSAP 방향성 슬라이드 전환 적용 */}
                <div
                  ref={categoryListRef}
                  key={`${activeCategoryTab}-${viewFilter}-${sortMode}`}
                  className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-200/60 dark:divide-zinc-800/70 stagger-list"
                >
                  {/* TAB 1: 플레이리스트 목록 */}
                  {activeCategoryTab === 'playlists' &&
                    (filteredPlaylists.length === 0 ? (
                      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        조건에 맞는 플레이리스트가 없습니다.
                      </div>
                    ) : (
                      filteredPlaylists.map((pl) => {
                        const isRenamed =
                          pl.customName.trim() !== pl.name.trim();
                        const isExternal =
                          Boolean(srcUser && pl.ownerId !== srcUser.id) &&
                          !pl.collaborative;
                        const activeTrackCount = pl.cachedTracks
                          ? pl.cachedTracks.filter((t) => t.selected !== false)
                              .length
                          : pl.tracksTotal;

                        return (
                          <div
                            key={pl.id}
                            className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all ${
                              !pl.selected ? 'opacity-55' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPlaylists((prev) =>
                                  prev.map((item) =>
                                    item.id === pl.id
                                      ? { ...item, selected: !item.selected }
                                      : item
                                  )
                                )
                              }
                              className="flex items-center gap-3 min-w-0 flex-1 text-left"
                            >
                              {pl.selected ? (
                                <CheckSquare
                                  key={`pl-sel-${pl.id}`}
                                  className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                                />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                              )}
                              {/* 플레이리스트 표지 이미지 */}
                              {pl.imageUrl ? (
                                <img
                                  src={pl.imageUrl}
                                  alt={pl.customName}
                                  className="w-10 h-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                                  <ListMusic className="w-5 h-5 stroke-[1.75]" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                    {pl.customName}
                                  </span>
                                  {isRenamed && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-spotify-soft text-spotify">
                                      이름 수정됨
                                    </span>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                      isExternal
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                        : 'bg-spotify-soft text-spotify font-medium'
                                    }`}
                                  >
                                    {pl.collaborative
                                      ? '협업'
                                      : isExternal
                                      ? '외부 팔로우'
                                      : '내 소유 · 트랙 복제'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {activeTrackCount}곡 · 소유자: {pl.ownerName} ·{' '}
                                  {pl.customPublic ? '공개' : '비공개'}
                                </p>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Tooltip content="공개/비공개 전환" side="top">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPlaylists((prev) =>
                                      prev.map((item) =>
                                        item.id === pl.id
                                          ? {
                                              ...item,
                                              customPublic: !item.customPublic,
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  aria-label="공개/비공개 전환"
                                  className="interactive-btn h-7 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-spotify/50 text-[11px] text-zinc-700 dark:text-zinc-200 flex items-center gap-1"
                                >
                                  {pl.customPublic ? (
                                    <>
                                      <Globe className="w-3 h-3 text-spotify stroke-[1.75]" />
                                      <span>공개</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3 text-zinc-400 stroke-[1.75]" />
                                      <span>비공개</span>
                                    </>
                                  )}
                                </button>
                              </Tooltip>

                              <Tooltip content="플레이리스트 이름·설명 및 수록곡 편집" side="top">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPlaylistPreview(pl)}
                                  className="interactive-btn h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-spotify/50 text-xs font-medium text-zinc-800 dark:text-zinc-100 flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                                  <span>편집</span>
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })
                    ))}

                  {/* TAB 2: 좋아요한 곡 목록 */}
                  {activeCategoryTab === 'liked_songs' &&
                    (isLoadingLiked && likedTracks.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin text-spotify" />
                        <span>
                          좋아요 표시한 곡 목록을 불러오는 중입니다 (
                          {likedLoadProgress.loaded} /{' '}
                          {likedLoadProgress.total || srcSummary?.likedSongsTotal || 0}
                          곡)...
                        </span>
                      </div>
                    ) : filteredLikedTracks.length === 0 ? (
                      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        조건에 맞는 좋아요 곡이 없습니다.
                      </div>
                    ) : (
                      <>
                        {filteredLikedTracks
                          .slice(0, visibleLikedLimit)
                          .map((track, idx) => {
                            const isSel =
                              track.selected !== false &&
                              migrationConfig.includeLikedSongs;
                            return (
                              <button
                                key={`${track.id}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setLikedTracks((prev) => {
                                    const updated = prev.map((item) =>
                                      item.id === track.id
                                        ? {
                                            ...item,
                                            selected: item.selected === false,
                                          }
                                        : item
                                    );
                                    const anySel = updated.some(
                                      (t) => t.selected !== false
                                    );
                                    setMigrationConfig((cfg) => ({
                                      ...cfg,
                                      includeLikedSongs: anySel,
                                    }));
                                    return updated;
                                  });
                                }}
                                className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all text-left ${
                                  !isSel ? 'opacity-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {isSel ? (
                                    <CheckSquare
                                      key={`tr-sel-${track.id}`}
                                      className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                                    />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                                  )}
                                  <span className="w-6 text-right font-mono text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                                    {idx + 1}
                                  </span>
                                  {/* 좋아요한 곡 앨범 자켓 이미지 */}
                                  {track.albumImageUrl ? (
                                    <img
                                      src={track.albumImageUrl}
                                      alt={track.albumName || track.name}
                                      className="w-10 h-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                                      <Heart className="w-5 h-5 text-spotify/70 stroke-[1.75]" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                      {track.name}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                      {track.artists.join(', ')} · {track.albumName}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {track.addedAt && (
                                    <span className="hidden sm:inline">
                                      {track.addedAt.slice(0, 10)}
                                    </span>
                                  )}
                                  <span>{formatDurationShort(track.durationMs)}</span>
                                </div>
                              </button>
                            );
                          })}

                        {filteredLikedTracks.length > visibleLikedLimit && (
                          <div className="p-3 flex items-center justify-center gap-2 bg-zinc-50/70 dark:bg-zinc-950/40">
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleLikedLimit((prev) => prev + 250)
                              }
                              className="interactive-btn h-7 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-100 hover:border-spotify/50"
                            >
                              250곡 더 보기 ({visibleLikedLimit} /{' '}
                              {filteredLikedTracks.length}곡 표시 중)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleLikedLimit(filteredLikedTracks.length)
                              }
                              className="interactive-btn h-7 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-spotify hover:border-spotify/50"
                            >
                              전체 펼치기
                            </button>
                          </div>
                        )}
                      </>
                    ))}

                  {/* TAB 3: 저장한 앨범 목록 */}
                  {activeCategoryTab === 'saved_albums' &&
                    (isLoadingAlbums && savedAlbums.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin text-spotify" />
                        <span>저장한 앨범 목록을 불러오는 중입니다...</span>
                      </div>
                    ) : filteredSavedAlbums.length === 0 ? (
                      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        조건에 맞는 저장 앨범이 없습니다.
                      </div>
                    ) : (
                      filteredSavedAlbums.map((album) => {
                        const isSel =
                          album.selected !== false &&
                          migrationConfig.includeSavedAlbums;
                        return (
                          <button
                            key={album.id}
                            type="button"
                            onClick={() => {
                              setSavedAlbums((prev) => {
                                const updated = prev.map((item) =>
                                  item.id === album.id
                                    ? {
                                        ...item,
                                        selected: item.selected === false,
                                      }
                                    : item
                                );
                                const anySel = updated.some(
                                  (a) => a.selected !== false
                                );
                                setMigrationConfig((cfg) => ({
                                  ...cfg,
                                  includeSavedAlbums: anySel,
                                }));
                                return updated;
                              });
                            }}
                            className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all text-left ${
                              !isSel ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isSel ? (
                                <CheckSquare
                                  key={`al-sel-${album.id}`}
                                  className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                                />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                              )}
                              {album.imageUrl ? (
                                <img
                                  src={album.imageUrl}
                                  alt={album.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                                  <Disc className="w-5 h-5 stroke-[1.75]" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                  {album.name}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {album.artists.join(', ')} ·{' '}
                                  {album.releaseDate || '발매일 미상'}
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-spotify-soft text-spotify shrink-0">
                              {album.totalTracks}곡
                            </span>
                          </button>
                        );
                      })
                    ))}

                  {/* TAB 4: 팔로우한 아티스트 목록 */}
                  {activeCategoryTab === 'followed_artists' &&
                    (isLoadingArtists && followedArtists.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin text-spotify" />
                        <span>팔로우한 아티스트 목록을 불러오는 중입니다...</span>
                      </div>
                    ) : filteredFollowedArtists.length === 0 ? (
                      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        조건에 맞는 팔로우 아티스트가 없습니다.
                      </div>
                    ) : (
                      filteredFollowedArtists.map((artist) => {
                        const isSel =
                          artist.selected !== false &&
                          migrationConfig.includeFollowedArtists;
                        return (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => {
                              setFollowedArtists((prev) => {
                                const updated = prev.map((item) =>
                                  item.id === artist.id
                                    ? {
                                        ...item,
                                        selected: item.selected === false,
                                      }
                                    : item
                                );
                                const anySel = updated.some(
                                  (ar) => ar.selected !== false
                                );
                                setMigrationConfig((cfg) => ({
                                  ...cfg,
                                  includeFollowedArtists: anySel,
                                }));
                                return updated;
                              });
                            }}
                            className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all text-left ${
                              !isSel ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isSel ? (
                                <CheckSquare
                                  key={`ar-sel-${artist.id}`}
                                  className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                                />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                              )}
                              {artist.imageUrl ? (
                                <img
                                  src={artist.imageUrl}
                                  alt={artist.name}
                                  className="w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                                  <Users className="w-5 h-5 stroke-[1.75]" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                  {artist.name}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ))}

                  {/* TAB 5: 팔로우한 팟캐스트 목록 */}
                  {activeCategoryTab === 'saved_shows' &&
                    (isLoadingShows && savedShows.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="w-5 h-5 animate-spin text-spotify" />
                        <span>팔로우한 팟캐스트 목록을 불러오는 중입니다...</span>
                      </div>
                    ) : filteredSavedShows.length === 0 ? (
                      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        저장된 팟캐스트(프로그램)가 없거나 검색 조건과 일치하지 않습니다.
                      </div>
                    ) : (
                      filteredSavedShows.map((show) => {
                        const isSel =
                          show.selected !== false &&
                          migrationConfig.includeSavedShows;
                        return (
                          <button
                            key={show.id}
                            type="button"
                            onClick={() => {
                              setSavedShows((prev) => {
                                const updated = prev.map((item) =>
                                  item.id === show.id
                                    ? {
                                        ...item,
                                        selected: item.selected === false,
                                      }
                                    : item
                                );
                                const anySel = updated.some(
                                  (s) => s.selected !== false
                                );
                                setMigrationConfig((cfg) => ({
                                  ...cfg,
                                  includeSavedShows: anySel,
                                }));
                                return updated;
                              });
                            }}
                            className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all text-left ${
                              !isSel ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isSel ? (
                                <CheckSquare
                                  key={`sh-sel-${show.id}`}
                                  className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                                />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                              )}
                              {show.imageUrl ? (
                                <img
                                  src={show.imageUrl}
                                  alt={show.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                                  <Mic2 className="w-5 h-5 stroke-[1.75]" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                                  {show.name}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {show.publisher}
                                  {show.description ? ` · ${show.description}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-spotify-soft text-spotify shrink-0">
                              {show.totalEpisodes}화
                            </span>
                          </button>
                        );
                      })
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================== */}
          {/* STEP 4: 실시간 데이터 이전 파이프라인 & 리포트 */}
          {/* ========================================================== */}
          {currentStep === 3 && (
            <section
              key="step-3"
              data-od-id="step-4-migration"
              className="cascade-cards relative z-10 max-w-5xl w-full mx-auto flex-1 min-h-0 flex flex-col justify-start gap-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    {workflowMode === 'create_backup'
                      ? '백업 파일(JSON) 생성'
                      : workflowMode === 'delete_account_data'
                      ? '계정 데이터 삭제 및 정리'
                      : workflowMode === 'backup_to_account'
                      ? '백업 데이터 새 계정으로 복원'
                      : '새 계정으로 음악 옮기기'}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {workflowMode === 'create_backup'
                      ? '선택한 플레이리스트와 보관함 데이터를 앱 백업 폴더에 JSON 파일로 생성합니다.'
                      : workflowMode === 'delete_account_data'
                      ? '선택한 플레이리스트 및 보관함 데이터를 계정에서 안전하게 삭제합니다.'
                      : workflowMode === 'backup_to_account'
                      ? '선택한 백업 파일의 플레이리스트와 음악을 대상 계정으로 안전하게 전송합니다.'
                      : '선택한 플레이리스트와 음악을 새 계정으로 안전하게 전송합니다.'}
                  </p>
                  {workflowMode === 'delete_account_data' && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                          backupBeforeDelete
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {backupBeforeDelete
                          ? '✓ 삭제 전 JSON 백업 자동 보존 활성화됨'
                          : '⚠️ 백업 보존 비활성화됨'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {failedTasks.length > 0 && !isMigrating && workflowMode !== 'create_backup' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStartMigration(failedTasks.map((f) => f.id))
                      }
                      className="interactive-btn h-10 px-4 rounded-xl border border-spotify/50 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                      <span>실패 항목 재시도 ({failedTasks.length})</span>
                    </button>
                  )}

                  {isMigrating ? (
                    <Tooltip content="진행 중인 작업 즉시 중단" side="top">
                      <button
                        type="button"
                        onClick={() => {
                          cancelMigrationRef.current = true;
                          setIsMigrationInterrupted(true);
                          appendLog('warn', '[중단] 사용자가 마이그레이션 중단을 요청했습니다.');
                        }}
                        className="interactive-btn h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 stroke-[1.75]" />
                        <span>중단</span>
                      </button>
                    </Tooltip>
                  ) : workflowMode === 'create_backup' ? (
                    <button
                      type="button"
                      onClick={handleStartCreateBackup}
                      className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-sm flex items-center gap-2 shadow-xs"
                    >
                      <HardDrive className="w-4 h-4 stroke-[1.75]" />
                      <span>백업 파일 생성 시작</span>
                    </button>
                  ) : workflowMode === 'delete_account_data' ? (
                    <button
                      type="button"
                      onClick={handleStartAccountDeletion}
                      className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center gap-2 shadow-xs"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.75]" />
                      <span>계정 데이터 삭제 시작</span>
                    </button>
                  ) : isMigrationInterrupted || (taskReports.length > 0 && taskReports.some((t) => t.status !== 'success')) ? (
                    <div
                      className="relative inline-flex items-center rounded-xl shadow-xs"
                      ref={resumeDropdownRef}
                    >
                      <button
                        type="button"
                        onClick={handleResumeMigration}
                        className="interactive-btn btn-shimmer h-10 px-5 rounded-l-xl bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-sm flex items-center gap-2 border-r border-spotify-fg/20"
                      >
                        <Play className="w-4 h-4 fill-current stroke-[1.75]" />
                        <span>이전 재개</span>
                      </button>
                      <Tooltip content="추가 실행 옵션" side="top">
                        <button
                          type="button"
                          aria-label="추가 실행 옵션 열기"
                          onClick={() => setIsResumeDropdownOpen((prev) => !prev)}
                          className="interactive-btn h-10 px-2.5 rounded-r-xl bg-spotify hover:bg-spotify-hover text-spotify-fg flex items-center justify-center transition-colors"
                        >
                          <ChevronDown
                            className={`w-4 h-4 stroke-[1.75] transition-transform duration-200 ${
                              isResumeDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </Tooltip>

                      {isResumeDropdownOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleResumeMigration}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 transition-colors group"
                          >
                            <Play className="w-4 h-4 text-spotify fill-current stroke-[1.75] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                                이전 재개
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                중단된 시점부터 남은 항목 전송
                              </p>
                            </div>
                          </button>
                          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleRestartMigration}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 transition-colors group"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-500 stroke-[1.75] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                                처음부터 다시 진행
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                모든 항목을 초기화하고 재시작
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartMigration()}
                      className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-sm flex items-center gap-2 shadow-xs"
                    >
                      <Play className="w-4 h-4 fill-current stroke-[1.75]" />
                      <span>
                        {taskReports.length > 0
                          ? '전체 다시 실행'
                          : workflowMode === 'backup_to_account'
                          ? '데이터 복원 시작'
                          : '음악 옮기기 시작'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* GSAP 기반 실시간 데이터 처리 시각화 파이프라인 카드 */}
              <MigrationPipeline
                isMigrating={isMigrating}
                progressPercent={progressPercent}
                progressStatusText={progressStatusText}
                totalMigratedItems={totalMigratedItems}
                totalSkippedItems={totalSkippedItems}
                workflowMode={workflowMode}
                srcUser={srcUser}
                dstUser={dstUser}
                selectedBackupFilename={selectedBackupFilename}
                runningTaskTitle={runningTask?.title}
              />

              {/* 좌측 항목별 리포트 테이블 + 우측 실시간 로그 콘솔 (라이트/다크 모두 완벽한 대비 및 전체 높이 스크롤) */}
              <div className="flex-1 min-h-[260px] grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-4">
                {/* 좌측: 작업 단위별 상세 리포트 */}
                <div className="lg:col-span-7 h-full min-h-0 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 shrink-0">
                    <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                      항목별 진행 상태 ({taskReports.length})
                    </span>
                    <span className="text-[11px] font-medium text-spotify">
                      실시간 업데이트
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-200/60 dark:divide-zinc-800/70 stagger-list">
                    {taskReports.length === 0 ? (
                      <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                        [마이그레이션 시작]을 누르면 항목별 진행 상태가 표시됩니다.
                      </div>
                    ) : (
                      taskReports.map((report) => (
                        <div
                          key={report.id}
                          className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-all ${
                            report.status === 'running'
                              ? 'bg-spotify-soft'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                              {report.title}
                            </p>
                            {report.errorMessage ? (
                              <p className="text-rose-500 truncate mt-0.5">
                                {report.errorMessage}
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                                추가 {report.migratedCount} · 중복 제외{' '}
                                {report.skippedCount} / 총 {report.totalCount}
                              </p>
                            )}
                          </div>

                          <span
                            key={`${report.id}-${report.status}`}
                            className={`animate-badge-pop px-2.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                              report.status === 'success'
                                ? 'bg-spotify-soft text-spotify'
                                : report.status === 'running'
                                ? 'bg-spotify text-spotify-fg'
                                : report.status === 'failed' ||
                                  report.status === 'partial'
                                ? 'bg-rose-500/15 text-rose-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {report.status === 'success'
                              ? '완료'
                              : report.status === 'running'
                              ? '전송 중'
                              : report.status === 'failed'
                              ? '실패'
                              : report.status === 'partial'
                              ? '일부 실패'
                              : report.status === 'skipped'
                              ? '건너뜀'
                              : '대기'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 우측: 실시간 로그 콘솔 (라이트/다크 자동 대응) */}
                <div className="lg:col-span-5 h-full min-h-0 rounded-xl bg-white dark:bg-theme-inset border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      <Terminal className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                      <span>작업 로그</span>
                    </div>
                    <Tooltip
                      content={
                        copiedLogs ? '복사 완료!' : '전체 작업 로그 클립보드 복사'
                      }
                      side="top"
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          const text = logs
                            .map((l) => `[${l.timestamp}] ${l.message}`)
                            .join('\n');
                          await navigator.clipboard.writeText(text);
                          setCopiedLogs(true);
                          setTimeout(() => setCopiedLogs(false), 2000);
                        }}
                        className="interactive-btn text-[11px] font-mono text-zinc-600 dark:text-zinc-300 hover:text-spotify flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3 stroke-[1.75]" />
                        <span>{copiedLogs ? '복사됨' : '복사'}</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div
                    ref={logContainerRef}
                    className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-1.5 font-mono text-[11px] bg-zinc-50/50 dark:bg-transparent"
                  >
                    {logs.length === 0 ? (
                      <p className="text-zinc-500 dark:text-zinc-400">
                        작업이 시작되면 상세 로그가 기록됩니다.
                      </p>
                    ) : (
                      logs.map((entry) => (
                        <div
                          key={entry.id}
                          className="animate-log-line leading-relaxed break-all"
                        >
                          <span className="text-zinc-500 dark:text-zinc-500 mr-1.5">
                            [{entry.timestamp}]
                          </span>
                          <span
                            className={
                              entry.level === 'success'
                                ? 'text-spotify font-medium'
                                : entry.level === 'warn'
                                ? 'text-amber-600 dark:text-amber-400'
                                : entry.level === 'error'
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : 'text-zinc-800 dark:text-zinc-200'
                            }
                          >
                            {entry.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* 하단 고정 네비게이션 액션 바 (GSAP 부드러운 전환 적용) */}
        <nav
          ref={dockRef}
          data-od-id="stage-navigation-dock"
          key={`stage-dock-${currentStep}`}
          className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-[#eef2f9]/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-2.5 z-20"
        >
          <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
            {currentStep === 0 && (
              <>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  입력한 자격 증명은 이 PC에만 안전하게 암호화 보관됩니다.
                </span>
                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-sm flex items-center gap-2 shadow-xs ml-auto"
                >
                  <span>다음</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </>
            )}

            {currentStep === 1 && (
              <>
                <Tooltip content="이전 단계로 돌아가기" side="top">
                  <button
                    type="button"
                    onClick={() => navigateToStep(0)}
                    className="interactive-btn h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-spotify/50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>이전</span>
                  </button>
                </Tooltip>

                <button
                  type="button"
                  onClick={handleProceedToStep3}
                  className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-sm flex items-center gap-2 shadow-xs"
                >
                  <span>다음</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <Tooltip content="이전 단계로 돌아가기" side="top">
                  <button
                    type="button"
                    onClick={() => navigateToStep(1)}
                    className="interactive-btn h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-spotify/50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>이전</span>
                  </button>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => navigateToStep(3)}
                  disabled={
                    selectedLikedCount === 0 &&
                    selectedAlbumsCount === 0 &&
                    selectedArtistsCount === 0 &&
                    selectedShowsCount === 0 &&
                    selectedPlaylistsCount === 0
                  }
                  className="interactive-btn btn-shimmer h-10 px-6 rounded-xl bg-spotify hover:bg-spotify-hover disabled:opacity-40 text-spotify-fg font-semibold text-sm flex items-center gap-2 shadow-xs"
                >
                  <span>다음</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </>
            )}

            {currentStep === 3 && (
              <>
                <Tooltip content="이전 단계로 돌아가기" side="top">
                  <button
                    type="button"
                    disabled={isMigrating}
                    onClick={() => navigateToStep(2)}
                    className="interactive-btn h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-spotify/50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>이전</span>
                  </button>
                </Tooltip>

                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {workflowMode === 'create_backup'
                    ? '생성된 백업 파일은 앱 하위 backups/ 폴더에 안전하게 보관됩니다.'
                    : workflowMode === 'delete_account_data'
                    ? '스포티파이 API 호출 제한에 맞춰 안전하게 순차 삭제됩니다.'
                    : '속도 제한(HTTP 429) 발생 시 자동으로 대기 후 재개됩니다.'}
                </span>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>

      {/* 단계 진입 시 가이드 모달 */}
      <TutorialModal
        isOpen={isStepModalOpen}
        guide={currentStepGuide}
        autoShowDisabled={autoShowDisabled}
        onToggleAutoShow={handleToggleAutoShow}
        onClose={() => setIsStepModalOpen(false)}
      />

      {/* 우측 슬라이드 가이드 Drawer */}
      <TutorialDrawer
        isOpen={isHelpDrawerOpen}
        activeStepIndex={currentStep}
        checklistState={checklistState}
        onToggleChecklist={handleToggleChecklist}
        onClose={() => setIsHelpDrawerOpen(false)}
      />

      {/* 플레이리스트 수록곡 미리보기 및 편집 모달 */}
      <PlaylistPreviewModal
        playlist={previewPlaylist}
        tracks={previewTracks}
        isLoadingTracks={isLoadingPreview}
        onSaveCustomization={handleSavePlaylistCustomization}
        onClose={() => setPreviewPlaylist(null)}
      />

      {/* 계정 데이터 비우기(초기화) 전용 모달 */}
      <AccountCleanerModal
        isOpen={isCleanerModalOpen}
        onClose={() => setIsCleanerModalOpen(false)}
        srcUser={srcUser}
        dstUser={dstUser}
        srcToken={srcToken?.access_token || null}
        dstToken={dstToken?.access_token || null}
        onCleanupFinished={(target) => {
          if (target === 'src' && srcToken?.access_token) {
            fetchUserPlaylists(srcToken.access_token)
              .then(setPlaylists)
              .catch(() => {});
          }
        }}
      />

      {/* GitHub Releases 기반 업데이트 확인 및 즉시 설치 모달 */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        isChecking={isCheckingUpdate}
        isDownloading={isDownloadingUpdate}
        updateInfo={updateInfo}
        progress={updateProgress}
        downloadError={updateDownloadError}
        onClose={() => setIsUpdateModalOpen(false)}
        onCheckAgain={() => void handleCheckForUpdates(false)}
        onStartUpdate={() => void handleStartUpdate()}
        onCancelDownload={() => void handleCancelUpdateDownload()}
        onOpenReleasePage={(url) => void handleOpenExternal(url)}
      />
    </div>
  </GlobalTooltipProvider>
);
};

export default App;
