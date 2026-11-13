import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  Check,
  CheckSquare,
  Clock,
  Globe,
  Loader2,
  Lock,
  Music2,
  Search,
  Square,
  X,
} from 'lucide-react';
import { SpotifyPlaylistSummary, SpotifyTrackItem } from '../../types/spotify';
import { Tooltip } from '../Tooltip/Tooltip';

// 플레이리스트 상세 미리보기 및 커스텀 편집 모달 Props 인터페이스
export interface PlaylistPreviewModalProps {
  playlist: SpotifyPlaylistSummary | null;
  tracks: SpotifyTrackItem[];
  isLoadingTracks: boolean;
  onSaveCustomization: (
    playlistId: string,
    updates: {
      customName: string;
      customDescription: string;
      customPublic: boolean;
      cachedTracks?: SpotifyTrackItem[];
    }
  ) => void;
  onClose: () => void;
}

// 밀리초를 mm:ss 포맷 문자열로 변환하는 함수
function formatDurationMs(ms: number): string {
  try {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } catch {
    return '0:00';
  }
}

// 플레이리스트 트랙 미리보기 및 커스텀 모달 컴포넌트 (라이트/다크 고대비 및 체크 애니메이션 적용)
export const PlaylistPreviewModal: React.FC<PlaylistPreviewModalProps> = ({
  playlist,
  tracks,
  isLoadingTracks,
  onSaveCustomization,
  onClose,
}) => {
  const [customName, setCustomName] = useState<string>(
    playlist?.customName || playlist?.name || ''
  );
  const [customDescription, setCustomDescription] = useState<string>(
    playlist?.customDescription || playlist?.description || ''
  );
  const [customPublic, setCustomPublic] = useState<boolean>(
    playlist?.customPublic ?? false
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editableTracks, setEditableTracks] = useState<SpotifyTrackItem[]>(tracks);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // GSAP 모달 오픈 애니메이션
  useEffect(() => {
    if (!playlist) return;
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
  }, [playlist]);

  useEffect(() => {
    if (playlist) {
      setCustomName(playlist.customName || playlist.name || '');
      setCustomDescription(
        playlist.customDescription || playlist.description || ''
      );
      setCustomPublic(playlist.customPublic ?? false);
      setSearchQuery('');
    }
  }, [playlist]);

  useEffect(() => {
    setEditableTracks(
      tracks.map((t) => ({
        ...t,
        selected: t.selected !== undefined ? t.selected : !t.isLocal,
      }))
    );
  }, [tracks]);

  // ESC 키 입력 시 닫기
  useEffect(() => {
    if (!playlist) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playlist, onClose]);

  if (!playlist) return null;

  const filteredTracks = editableTracks.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.artists.join(' ').toLowerCase().includes(q) ||
      t.albumName.toLowerCase().includes(q)
    );
  });

  const selectedTrackCount = editableTracks.filter(
    (t) => t.selected !== false && !t.isLocal
  ).length;

  // 개별 트랙 체크 토글 함수
  const handleToggleTrack = (trackIndex: number): void => {
    setEditableTracks((prev) =>
      prev.map((item, idx) =>
        idx === trackIndex && !item.isLocal
          ? { ...item, selected: item.selected === false }
          : item
      )
    );
  };

  // 필터된 트랙 일괄 선택/해제 함수
  const handleSetAllFilteredTracks = (selected: boolean): void => {
    const targetIds = new Set(filteredTracks.map((t) => t.id));
    setEditableTracks((prev) =>
      prev.map((t) =>
        !t.isLocal && targetIds.has(t.id) ? { ...t, selected } : t
      )
    );
  };

  // 변경사항 저장 처리 함수
  const handleSave = (): void => {
    try {
      onSaveCustomization(playlist.id, {
        customName: customName.trim() || playlist.name,
        customDescription: customDescription.trim(),
        customPublic,
        cachedTracks: editableTracks.length > 0 ? editableTracks : undefined,
      });
      onClose();
    } catch (error) {
      console.error('플레이리스트 설정 저장 실패:', error);
    }
  };

  return (
    <div
      ref={backdropRef}
      data-od-id="playlist-preview-modal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 cursor-pointer"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[80vh] cursor-default"
      >
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            {playlist.imageUrl ? (
              <img
                src={playlist.imageUrl}
                alt={playlist.name}
                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-spotify-soft border border-spotify/30 flex items-center justify-center text-spotify shrink-0">
                <Music2 className="w-4 h-4 stroke-[1.75]" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                플레이리스트 설정 및 수록곡 선택
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                원본: {playlist.name} · 선택 {selectedTrackCount} /{' '}
                {editableTracks.length || playlist.tracksTotal}곡 · 소유자:{' '}
                {playlist.ownerName}
              </p>
            </div>
          </div>

          <Tooltip content="닫기" side="left">
            <button
              type="button"
              onClick={onClose}
              aria-label="미리보기 닫기"
              className="interactive-btn h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </Tooltip>
        </div>

        {/* 커스텀 메타데이터 편집 폼 */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
          <div className="md:col-span-5 space-y-1">
            <label
              htmlFor="pl-custom-name"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              새 계정에 생성할 플레이리스트 이름
            </label>
            <input
              id="pl-custom-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full h-8 px-3 rounded-lg text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-spotify"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label
              htmlFor="pl-custom-desc"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              플레이리스트 설명
            </label>
            <input
              id="pl-custom-desc"
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="설명 입력"
              className="w-full h-8 px-3 rounded-lg text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-spotify"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              공개 범위
            </span>
            <button
              type="button"
              onClick={() => setCustomPublic((prev) => !prev)}
              className="interactive-btn w-full h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5 hover:border-spotify/50"
            >
              {customPublic ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
                  <span>공개</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-400 stroke-[1.75]" />
                  <span>비공개</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 트랙 검색 및 일괄 선택 바 */}
        <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 아티스트, 앨범 검색..."
              className="w-full h-7 pl-8 pr-3 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-spotify"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSetAllFilteredTracks(true)}
              className="interactive-btn h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={() => handleSetAllFilteredTracks(false)}
              className="interactive-btn h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              전체 해제
            </button>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 ml-1">
              {filteredTracks.length}곡
            </span>
          </div>
        </div>

        {/* 트랙 리스트 영역 (빈 공간 없이 모달 높이에 꽉 차게 스크롤) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-1">
          {isLoadingTracks ? (
            <div className="h-full flex flex-col items-center justify-center gap-2.5 text-zinc-500 dark:text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-spotify stroke-[1.75]" />
              <p className="text-xs">수록곡 정보를 불러오는 중입니다...</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 text-center space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                표시할 수록곡이 없거나 외부 팔로우 플레이리스트입니다.
              </p>
              <p>
                다른 사용자가 만든 플레이리스트는 새 계정 보관함에 동일하게 팔로우(저장)됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-900 stagger-list">
              {editableTracks.map((track, idx) => {
                const q = searchQuery.trim().toLowerCase();
                if (
                  q &&
                  !track.name.toLowerCase().includes(q) &&
                  !track.artists.join(' ').toLowerCase().includes(q) &&
                  !track.albumName.toLowerCase().includes(q)
                ) {
                  return null;
                }
                const isSelected = track.selected !== false && !track.isLocal;

                return (
                  <button
                    key={`${track.id}-${idx}`}
                    type="button"
                    disabled={track.isLocal}
                    onClick={() => handleToggleTrack(idx)}
                    className={`w-full py-2.5 flex items-center justify-between gap-4 text-xs text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all ${
                      !isSelected ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isSelected ? (
                        <CheckSquare
                          key={`sel-${track.id}`}
                          className="w-4 h-4 text-spotify shrink-0 stroke-[2.2] animate-check-pop"
                        />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400 shrink-0 stroke-[1.75]" />
                      )}
                      <span className="w-5 text-right font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                        {idx + 1}
                      </span>
                      {/* 앨범 커버 이미지 */}
                      {track.albumImageUrl ? (
                        <img
                          src={track.albumImageUrl}
                          alt={track.albumName || track.name}
                          className="w-8 h-8 rounded object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400">
                          <Music2 className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-950 dark:text-zinc-100 truncate">
                            {track.name}
                          </p>
                          {track.isLocal && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 shrink-0">
                              로컬 파일 제외
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 truncate">
                          {track.artists.join(', ')} · {track.albumName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                      <Clock className="w-3 h-3 stroke-[1.75]" />
                      <span>{formatDurationMs(track.durationMs)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 하단 액션 바 */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            체크한 수록곡(
            <strong className="font-mono text-spotify">{selectedTrackCount}</strong>
            곡)만 원본 순서대로 이전됩니다.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="interactive-btn h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="interactive-btn h-8 px-4 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>설정 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
