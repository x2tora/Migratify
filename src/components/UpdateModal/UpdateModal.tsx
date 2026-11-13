import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { UpdateCheckResult, UpdateProgressInfo } from '../../types/spotify';

export interface UpdateModalProps {
  isOpen: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  updateInfo: UpdateCheckResult | null;
  progress: UpdateProgressInfo | null;
  downloadError: string | null;
  onClose: () => void;
  onCheckAgain: () => void;
  onStartUpdate: () => void;
  onCancelDownload: () => void;
  onOpenReleasePage: (url: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  isChecking,
  isDownloading,
  updateInfo,
  progress,
  downloadError,
  onClose,
  onCheckAgain,
  onStartUpdate,
  onCancelDownload,
  onOpenReleasePage,
}) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (backdropRef.current && dialogRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      );
      gsap.fromTo(
        dialogRef.current,
        { scale: 0.98, y: 6, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, onClose]);

  if (!isOpen) return null;

  const hasUpdate = Boolean(updateInfo?.success && updateInfo?.hasUpdate);
  const hasError = Boolean(
    downloadError || (updateInfo && !updateInfo.success)
  );
  const errorMessage = downloadError || updateInfo?.error || '';
  const releaseUrl =
    updateInfo?.htmlUrl || 'https://github.com/x2tora/Migratify/releases';

  return (
    <div
      ref={backdropRef}
      data-od-id="update-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-spotify-soft text-spotify flex items-center justify-center">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2
                id="update-modal-title"
                className="text-sm font-bold text-zinc-950 dark:text-zinc-100"
              >
                소프트웨어 업데이트
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                GitHub Releases (x2tora/Migratify)
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isDownloading}
            onClick={onClose}
            aria-label="닫기"
            className="interactive-btn w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4">
          {isChecking && (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-spotify" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  최신 버전을 확인하는 중입니다...
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  GitHub 저장소에서 릴리스 정보를 조회하고 있습니다.
                </p>
              </div>
            </div>
          )}

          {!isChecking && hasError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                  업데이트 확인 또는 다운로드 중 오류가 발생했습니다
                </p>
                <p className="text-xs text-rose-700/90 dark:text-rose-400/90 mt-1 break-all">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {!isChecking && !hasError && updateInfo && !hasUpdate && (
            <div className="py-4 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-11 h-11 rounded-full bg-spotify-soft text-spotify flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  {updateInfo.noReleasesYet
                    ? '현재 설치된 버전을 사용 중입니다'
                    : '최신 버전을 사용 중입니다'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  현재 버전:{' '}
                  <span className="font-mono font-semibold text-spotify">
                    v{updateInfo.currentVersion}
                  </span>
                  {updateInfo.noReleasesYet
                    ? ' (GitHub에 아직 게시된 릴리스가 없습니다)'
                    : ''}
                </p>
              </div>
            </div>
          )}

          {!isChecking && !hasError && hasUpdate && updateInfo && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between rounded-xl border border-spotify/30 bg-spotify-soft/40 px-4 py-3">
                <div>
                  <span className="text-[11px] font-semibold text-spotify uppercase tracking-wide">
                    새 업데이트 사용 가능
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      v{updateInfo.currentVersion}
                    </span>
                    <span className="text-xs text-zinc-400">→</span>
                    <span className="font-mono text-sm font-bold text-spotify">
                      v{updateInfo.latestVersion}
                    </span>
                  </div>
                </div>
                {updateInfo.assetSize ? (
                  <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {formatBytes(updateInfo.assetSize)}
                  </span>
                ) : null}
              </div>

              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    릴리스 노트 ({updateInfo.releaseName})
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {isDownloading && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-spotify" />
                      설치 파일 다운로드 중...
                    </span>
                    <span className="font-mono text-spotify font-semibold">
                      {progress ? `${progress.percent}%` : '0%'}
                      {progress && progress.total > 0
                        ? ` (${formatBytes(progress.transferred)} / ${formatBytes(
                            progress.total
                          )})`
                        : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-spotify transition-all duration-150"
                      style={{ width: `${progress?.percent ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 액션 바 */}
        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenReleasePage(releaseUrl)}
            className="interactive-btn h-8 px-3 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <span>GitHub Releases</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            {isDownloading ? (
              <button
                type="button"
                onClick={onCancelDownload}
                className="interactive-btn h-8 px-3.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
              >
                다운로드 취소
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isChecking}
                  onClick={onCheckAgain}
                  className="interactive-btn h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`}
                  />
                  <span>다시 확인</span>
                </button>

                {hasUpdate && updateInfo?.downloadUrl ? (
                  <button
                    type="button"
                    onClick={onStartUpdate}
                    className="interactive-btn h-8 px-4 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>지금 업데이트</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="interactive-btn h-8 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
                  >
                    확인
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
