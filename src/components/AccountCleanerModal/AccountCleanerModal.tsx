import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  AlertTriangle,
  Check,
  Disc,
  Heart,
  ListMusic,
  Mic2,
  Radio,
  RotateCw,
  Trash2,
  X,
  User,
} from 'lucide-react';
import {
  AccountCleanupCategory,
  AccountCleanupReport,
  LibrarySummaryCounts,
  MigrationLogEntry,
  SpotifyPlaylistSummary,
  SpotifyUserProfile,
} from '../../types/spotify';
import {
  buildFullBackupArchive,
  executeAccountCleanup,
  fetchLibrarySummary,
  fetchUserPlaylists,
} from '../../services/spotifyService';
import { Tooltip } from '../Tooltip/Tooltip';

// 계정 데이터 삭제 모달 컴포넌트 Props 인터페이스
export interface AccountCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  srcUser: SpotifyUserProfile | null;
  dstUser: SpotifyUserProfile | null;
  srcToken: string | null;
  dstToken: string | null;
  onCleanupFinished?: (targetAccount: 'src' | 'dst') => void;
}

// 카테고리 메타데이터 정의
interface CategoryMeta {
  key: AccountCleanupCategory;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  getCount: (summary: LibrarySummaryCounts | null) => number;
}

const CATEGORY_ITEMS: CategoryMeta[] = [
  {
    key: 'playlists',
    title: '플레이리스트',
    description: '생성 및 보관함에 추가된 모든 플레이리스트 삭제(언팔로우)',
    Icon: ListMusic,
    getCount: (s) => s?.playlistsTotal ?? 0,
  },
  {
    key: 'liked_songs',
    title: '좋아요 표시한 곡',
    description: '보관함에 저장된 모든 좋아요 곡 목록 삭제',
    Icon: Heart,
    getCount: (s) => s?.likedSongsTotal ?? 0,
  },
  {
    key: 'saved_albums',
    title: '저장한 앨범',
    description: '보관함에 저장된 모든 음악 앨범 목록 삭제',
    Icon: Disc,
    getCount: (s) => s?.savedAlbumsTotal ?? 0,
  },
  {
    key: 'followed_artists',
    title: '팔로우한 아티스트',
    description: '팔로우 중인 모든 아티스트 언팔로우',
    Icon: User,
    getCount: (s) => s?.followedArtistsTotal ?? 0,
  },
  {
    key: 'saved_shows',
    title: '팔로우한 팟캐스트',
    description: '보관함에 등록된 모든 팟캐스트(쇼) 목록 삭제',
    Icon: Radio,
    getCount: (s) => s?.savedShowsTotal ?? 0,
  },
];

// 계정 데이터 삭제(초기화) 전용 모달 컴포넌트
export const AccountCleanerModal: React.FC<AccountCleanerModalProps> = ({
  isOpen,
  onClose,
  srcUser,
  dstUser,
  srcToken,
  dstToken,
  onCleanupFinished,
}) => {
  // 정리 대상 계정 ('src': 가져올 계정, 'dst': 받을 계정)
  const [targetAccount, setTargetAccount] = useState<'src' | 'dst'>('dst');

  // 보관함 항목 수 요약 및 로딩 상태
  const [summary, setSummary] = useState<LibrarySummaryCounts | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // 선택된 카테고리 목록
  const [selectedCategories, setSelectedCategories] = useState<
    Record<AccountCleanupCategory, boolean>
  >({
    playlists: true,
    liked_songs: true,
    saved_albums: true,
    followed_artists: true,
    saved_shows: true,
  });

  // 영구 삭제 동의 체크박스 상태
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);

  // 삭제 전 JSON 백업 자동 보존 옵션 (기본값: true)
  const [backupBeforeDelete, setBackupBeforeDelete] = useState<boolean>(true);

  // 작업 실행 상태
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [logs, setLogs] = useState<MigrationLogEntry[]>([]);
  const [reports, setReports] = useState<AccountCleanupReport[]>([]);

  // 작업 취소 신호 참조
  const cancelRequestedRef = useRef<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // GSAP 모달 팝업 애니메이션
  useEffect(() => {
    if (!isOpen) return;
    if (backdropRef.current && dialogRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      gsap.fromTo(
        dialogRef.current,
        { scale: 0.98, y: 8, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const activeToken = targetAccount === 'src' ? srcToken : dstToken;
  const activeUser = targetAccount === 'src' ? srcUser : dstUser;

  // 로그 자동 스크롤
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 보관함 데이터 수치 불러오기 함수
  const loadSummary = async (token: string | null): Promise<void> => {
    try {
      if (!token) {
        setSummary(null);
        return;
      }
      setIsLoadingSummary(true);
      setSummaryError(null);
      const counts = await fetchLibrarySummary(token);
      setSummary(counts);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSummaryError(`보관함 정보를 불러오지 못했습니다: ${msg}`);
      console.error('보관함 요약 로드 실패:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // 모달 오픈 또는 대상 계정 변경 시 데이터 재조회
  useEffect(() => {
    if (isOpen) {
      setIsCompleted(false);
      setHasAgreed(false);
      setLogs([]);
      setReports([]);
      setProgressPercent(0);
      setStatusMessage('');
      cancelRequestedRef.current = false;
      loadSummary(activeToken);
    }
  }, [isOpen, targetAccount, activeToken]);

  // ESC 키 입력 시 모달 닫기 (작업 진행 중이 아닐 때)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isRunning) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, onClose]);

  if (!isOpen) return null;

  // 카테고리 체크박스 토글
  const handleToggleCategory = (cat: AccountCleanupCategory): void => {
    if (isRunning) return;
    setSelectedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // 전체 선택/해제 토글
  const handleToggleSelectAll = (): void => {
    if (isRunning) return;
    const allSelected = CATEGORY_ITEMS.every((c) => selectedCategories[c.key]);
    const nextState = !allSelected;
    const updated: Record<AccountCleanupCategory, boolean> = {
      playlists: nextState,
      liked_songs: nextState,
      saved_albums: nextState,
      followed_artists: nextState,
      saved_shows: nextState,
    };
    setSelectedCategories(updated);
  };

  // 선택된 항목들의 총 개수 계산
  const totalItemsToDelete = CATEGORY_ITEMS.reduce((sum, item) => {
    if (selectedCategories[item.key]) {
      return sum + item.getCount(summary);
    }
    return sum;
  }, 0);

  // 계정 데이터 삭제 작업 시작
  const handleStartCleanup = async (): Promise<void> => {
    try {
      if (!activeToken) {
        alert('계정이 연결되어 있지 않습니다.');
        return;
      }

      const catsToClean = CATEGORY_ITEMS.filter(
        (item) => selectedCategories[item.key]
      ).map((item) => item.key);

      if (catsToClean.length === 0) {
        alert('비울 항목을 1개 이상 선택해주세요.');
        return;
      }

      if (!hasAgreed) {
        alert('영구 삭제 동의 체크박스에 체크해주세요.');
        return;
      }

      setIsRunning(true);
      setIsCompleted(false);
      cancelRequestedRef.current = false;
      setLogs([]);
      setProgressPercent(0);
      setStatusMessage('정리 작업을 준비하고 있습니다...');

      // 삭제 전 JSON 백업 자동 생성 및 보존
      if (backupBeforeDelete && window.electronAPI?.saveAppBackup && activeUser) {
        setStatusMessage('삭제 전 JSON 백업 파일 자동 생성 및 보존 중...');
        setLogs((prev) => [
          ...prev,
          {
            id: `backup-log-start-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('ko-KR', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            level: 'info',
            message: `[보존] '${activeUser.display_name}' 계정의 백업 파일 생성을 시작합니다.`,
          },
        ]);

        let userPlaylists: SpotifyPlaylistSummary[] = [];
        try {
          userPlaylists = await fetchUserPlaylists(activeToken);
        } catch {
          // 플레이리스트 조회 실패 시 빈 배열로 진행
        }

        const archive = await buildFullBackupArchive(
          activeToken,
          activeUser,
          userPlaylists,
          (msg) => {
            setStatusMessage(`[백업 보존] ${msg}`);
          }
        );

        const jsonStr = JSON.stringify(archive, null, 2);
        const saveRes = await window.electronAPI.saveAppBackup({
          content: jsonStr,
        });

        if (saveRes.success) {
          setLogs((prev) => [
            ...prev,
            {
              id: `backup-log-succ-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('ko-KR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              level: 'success',
              message: `[보존 완료] 백업 파일이 안전하게 보존되었습니다: ${saveRes.filename}`,
            },
          ]);
        } else {
          throw new Error(
            `백업 파일 저장 실패: ${saveRes.error || '알 수 없는 오류'}. 데이터 보호를 위해 정리를 중단합니다.`
          );
        }
      }

      const resultReports = await executeAccountCleanup({
        token: activeToken,
        categories: catsToClean,
        shouldCancel: () => cancelRequestedRef.current,
        onProgress: (percent, msg) => {
          setProgressPercent(percent);
          setStatusMessage(msg);
        },
        onLog: (level, message) => {
          setLogs((prev) => [
            ...prev,
            {
              id: `clean-log-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toLocaleTimeString('ko-KR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              level,
              message,
            },
          ]);
        },
        onReportUpdate: (updatedReports) => {
          setReports(updatedReports);
        },
      });

      setIsCompleted(true);
      if (onCleanupFinished) {
        onCleanupFinished(targetAccount);
      }

      // 계정 데이터 삭제 완료 후 최신 보관함 개수 새로고침
      await loadSummary(activeToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      alert(`계정 정리 중 오류 발생: ${msg}`);
      console.error('계정 정리 작업 오류:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // 작업 중단 요청
  const handleCancelCleanup = (): void => {
    try {
      cancelRequestedRef.current = true;
      setStatusMessage('작업 중단 요청 중입니다...');
    } catch (error) {
      console.error('작업 중단 요청 오류:', error);
    }
  };

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cleaner-modal-title"
      onClick={() => {
        if (!isRunning) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity cursor-pointer"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="max-w-2xl w-full bg-white dark:bg-theme-card border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden cursor-default"
      >
        {/* 모달 상단 헤더 */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-theme-inset">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2
                id="cleaner-modal-title"
                className="text-base font-bold text-zinc-900 dark:text-zinc-100"
              >
                계정 데이터 삭제
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                원하는 계정의 플레이리스트, 좋아요한 곡, 앨범, 아티스트를 안전하게 삭제(정리)합니다.
              </p>
            </div>
          </div>
          <Tooltip content="닫기" side="left">
            <button
              type="button"
              disabled={isRunning}
              onClick={onClose}
              aria-label="닫기"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </Tooltip>
        </div>

        {/* 모달 스크롤 본문 */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* 1. 대상 계정 선택 탭 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              정리할 대상 계정 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setTargetAccount('src')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  targetAccount === 'src'
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    가져올 계정 (기존)
                  </span>
                  {targetAccount === 'src' && (
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      선택됨
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-1">
                  {srcUser ? srcUser.display_name : '계정 미연결'}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {srcUser ? `ID: ${srcUser.id}` : '1단계에서 연결 필요'}
                </p>
              </button>

              <button
                type="button"
                disabled={isRunning}
                onClick={() => setTargetAccount('dst')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  targetAccount === 'dst'
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    받을 계정 (도착)
                  </span>
                  {targetAccount === 'dst' && (
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      선택됨
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-1">
                  {dstUser ? dstUser.display_name : '계정 미연결'}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {dstUser ? `ID: ${dstUser.id}` : '1단계에서 연결 필요'}
                </p>
              </button>
            </div>
          </div>

          {/* 계정 미연결 시 안내 */}
          {!activeToken && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 stroke-[2]" />
              <span>
                선택한 계정이 로그인되어 있지 않습니다. 메인 화면의 2단계 '계정 연결'에서
                해당 계정에 먼저 로그인해주세요.
              </span>
            </div>
          )}

          {/* 2. 보관함 항목 현황 및 카테고리 체크리스트 */}
          {activeToken && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  비울 항목 선택
                </span>
                <div className="flex items-center gap-2">
                  <Tooltip content="현재 보관함 개수 새로고침" side="top">
                    <button
                      type="button"
                      disabled={isRunning || isLoadingSummary}
                      onClick={() => loadSummary(activeToken)}
                      className="interactive-btn text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800"
                      aria-label="현재 보관함 개수 새로고침"
                    >
                      <RotateCw
                        className={`w-3 h-3 ${isLoadingSummary ? 'animate-spin' : ''}`}
                      />
                      <span>새로고침</span>
                    </button>
                  </Tooltip>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={handleToggleSelectAll}
                    className="interactive-btn text-xs text-spotify hover:underline font-semibold px-2 py-1"
                  >
                    {CATEGORY_ITEMS.every((c) => selectedCategories[c.key])
                      ? '전체 해제'
                      : '전체 선택'}
                  </button>
                </div>
              </div>

              {summaryError && (
                <p className="text-xs text-rose-500">{summaryError}</p>
              )}

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-theme-card">
                {CATEGORY_ITEMS.map(({ key, title, description, Icon, getCount }) => {
                  const count = getCount(summary);
                  const isChecked = selectedCategories[key];

                  return (
                    <label
                      key={key}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isChecked
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={isRunning}
                          checked={isChecked}
                          onChange={() => handleToggleCategory(key)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500 shrink-0"
                        />
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                          <Icon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {title}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-semibold ${
                            count > 0
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {isLoadingSummary ? '...' : `${count.toLocaleString()}개`}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. 영구 삭제 경고 및 확인 동의 */}
          {activeToken && !isRunning && !isCompleted && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 stroke-[2.4] shrink-0" />
                  <span>영구 삭제 주의</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  삭제된 플레이리스트 및 보관함 항목은 스포티파이 서버에서 즉시 제거되며 다시
                  복구할 수 없습니다. 삭제를 원치 않는 항목은 상단 체크박스에서 해제하세요.
                </p>
              </div>

              {/* 삭제 전 JSON 백업 보존 체크박스 */}
              <label className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-theme-inset flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isRunning}
                  checked={backupBeforeDelete}
                  onChange={(e) => setBackupBeforeDelete(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-spotify focus:ring-spotify shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    삭제 전 JSON 백업 파일 자동 생성 및 보존 (권장)
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    스포티파이에서 영구 삭제를 진행하기 전, 현재 계정의 모든 보관함 데이터를 앱 하위 backups/ 폴더에 안전하게 자동 백업합니다.
                  </p>
                </div>
              </label>

              <label className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-theme-inset flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500 shrink-0"
                />
                <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                  위 주의사항을 모두 확인하였으며,{' '}
                  <strong className="text-rose-600 dark:text-rose-400">
                    선택한 항목({totalItemsToDelete.toLocaleString()}개)의 영구 삭제에 동의합니다.
                  </strong>
                </span>
              </label>
            </div>
          )}

          {/* 4. 작업 진행 상태 및 실시간 로그 */}
          {(isRunning || isCompleted) && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-theme-inset space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {statusMessage || '정리 작업 진행 중...'}
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {progressPercent}%
                  </span>
                </div>
                <progress
                  className="studio-progress"
                  value={progressPercent}
                  max={100}
                />
              </div>

              {/* 실시간 로그 창 */}
              <div
                ref={logContainerRef}
                className="h-32 overflow-y-auto p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] space-y-1 border border-zinc-800"
              >
                {logs.length === 0 ? (
                  <p className="text-zinc-600">작업 로그가 여기에 표시됩니다...</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 ${
                        log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : log.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 액션 버튼 */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-theme-inset">
          <div>
            {isCompleted && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[2.4]" />
                계정 데이터 삭제 완료됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleCancelCleanup}
                className="interactive-btn px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                작업 중단
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="interactive-btn px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {isCompleted ? '확인 및 닫기' : '취소'}
                </button>
                {!isCompleted && (
                  <button
                    type="button"
                    disabled={
                      !activeToken ||
                      totalItemsToDelete === 0 ||
                      !hasAgreed ||
                      isLoadingSummary
                    }
                    onClick={handleStartCleanup}
                    className="interactive-btn px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                    <span>선택한 {totalItemsToDelete.toLocaleString()}개 항목 삭제</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
