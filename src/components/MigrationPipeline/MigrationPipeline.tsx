import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  FolderOpen,
  HardDrive,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { SpotifyUserProfile } from '../../types/spotify';
import { WorkflowMode } from '../../types/spotify';

export interface MigrationPipelineProps {
  isMigrating: boolean;
  progressPercent: number;
  progressStatusText: string;
  totalMigratedItems: number;
  totalSkippedItems: number;
  workflowMode: WorkflowMode;
  srcUser: SpotifyUserProfile | null;
  dstUser: SpotifyUserProfile | null;
  selectedBackupFilename: string | null;
  runningTaskTitle?: string;
}

// GSAP 파티클 색상 팔레트 (앱 테마 라벤더, 민트, 골드, 화이트)
const CONFETTI_COLORS = [
  '#C6A0F6', // 라벤더 메인 액센트
  '#D4B4FB', // 라벤더 밝은 톤
  '#34D399', // 성공 에메랄드
  '#FBBF24', // 골드 옐로우
  '#60A5FA', // 스카이 블루
  '#FFFFFF', // 화이트
];

export const MigrationPipeline: React.FC<MigrationPipelineProps> = ({
  isMigrating,
  progressPercent,
  progressStatusText,
  totalMigratedItems,
  totalSkippedItems,
  workflowMode,
  srcUser,
  dstUser,
  selectedBackupFilename,
  runningTaskTitle,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressGlowRef = useRef<HTMLDivElement | null>(null);
  const streamTrackRef = useRef<HTMLDivElement | null>(null);
  const dotsContainerRef = useRef<HTMLDivElement | null>(null);
  const srcPulseRef = useRef<HTMLDivElement | null>(null);
  const dstPulseRef = useRef<HTMLDivElement | null>(null);
  const confettiLayerRef = useRef<HTMLDivElement | null>(null);
  const successBadgeRef = useRef<HTMLDivElement | null>(null);

  // 이전 마이그레이션 실행 상태 추적 (완료 순간 1회 폭죽 격발용)
  const prevMigratingRef = useRef<boolean>(isMigrating);
  const prevPercentRef = useRef<number>(progressPercent);
  const hasTriggeredCelebrationRef = useRef<boolean>(false);

  // 1. 프로그레스 바 너비 및 글로우 헤드 GSAP 애니메이션
  useEffect(() => {
    if (!progressBarRef.current) return;

    gsap.to(progressBarRef.current, {
      width: `${Math.min(100, Math.max(0, progressPercent))}%`,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    if (progressGlowRef.current) {
      gsap.to(progressGlowRef.current, {
        opacity: isMigrating ? 1 : progressPercent === 100 ? 0.8 : 0,
        scale: isMigrating ? 1.2 : 1,
        duration: 0.3,
      });
    }
  }, [progressPercent, isMigrating]);

  // 2. 실시간 패킷 스트림 (출발지 -> 목적지 이동 파티클) 및 펄스 링 GSAP 애니메이션
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 펄스 링 루프 애니메이션
      if (srcPulseRef.current && dstPulseRef.current) {
        if (isMigrating) {
          gsap.to([srcPulseRef.current, dstPulseRef.current], {
            scale: 1.5,
            opacity: 0,
            duration: 1.3,
            repeat: -1,
            ease: 'power2.out',
            stagger: 0.4,
          });
        } else {
          gsap.killTweensOf([srcPulseRef.current, dstPulseRef.current]);
          gsap.set([srcPulseRef.current, dstPulseRef.current], {
            scale: 1,
            opacity: 0,
          });
        }
      }

      // 패킷 스트림 점 애니메이션
      if (dotsContainerRef.current && streamTrackRef.current) {
        const dots = dotsContainerRef.current.querySelectorAll('.stream-packet');
        if (isMigrating) {
          const trackWidth = streamTrackRef.current.offsetWidth || 100;
          gsap.killTweensOf(dots);
          gsap.set(dots, { x: 0, opacity: 0, scale: 0.6 });

          dots.forEach((dot, idx) => {
            gsap.to(dot, {
              x: trackWidth,
              opacity: 1,
              scale: 1.1,
              duration: 1.2,
              repeat: -1,
              delay: idx * 0.24,
              ease: 'power1.inOut',
              keyframes: [
                { opacity: 0, scale: 0.5, offset: 0 },
                { opacity: 1, scale: 1.1, offset: 0.25 },
                { opacity: 1, scale: 1.1, offset: 0.75 },
                { opacity: 0, scale: 0.6, offset: 1 },
              ],
            });
          });
        } else {
          gsap.to(dots, {
            opacity: 0,
            scale: 0.5,
            duration: 0.25,
            onComplete: () => {
              gsap.killTweensOf(dots);
              gsap.set(dots, { x: 0, opacity: 0 });
            },
          });
        }
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isMigrating]);

  // 3. 작업 완료 시(100% 도달 및 마이그레이션 종료) GSAP 축하 컨페티 폭죽 모션
  useEffect(() => {
    const justFinished =
      (prevMigratingRef.current && !isMigrating && progressPercent === 100) ||
      (prevPercentRef.current < 100 && progressPercent === 100 && !isMigrating);

    prevMigratingRef.current = isMigrating;
    prevPercentRef.current = progressPercent;

    if (isMigrating) {
      hasTriggeredCelebrationRef.current = false;
      return;
    }

    if (justFinished && !hasTriggeredCelebrationRef.current) {
      hasTriggeredCelebrationRef.current = true;

      if (confettiLayerRef.current) {
        const layer = confettiLayerRef.current;
        layer.innerHTML = ''; // 기존 파티클 클리어

        const particleCount = 38;
        const particles: HTMLDivElement[] = [];

        for (let i = 0; i < particleCount; i++) {
          const p = document.createElement('div');
          const size = Math.floor(Math.random() * 6) + 5; // 5px ~ 10px
          const isCircle = Math.random() > 0.5;
          const color =
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

          p.style.position = 'absolute';
          p.style.width = `${size}px`;
          p.style.height = `${size}px`;
          p.style.backgroundColor = color;
          p.style.borderRadius = isCircle ? '50%' : '2px';
          p.style.pointerEvents = 'none';
          p.style.left = '50%';
          p.style.top = '50%';
          p.style.boxShadow = `0 0 8px ${color}88`;
          p.style.zIndex = '40';
          layer.appendChild(p);
          particles.push(p);
        }

        const tl = gsap.timeline();

        // 파티클 사방 폭발 및 중력 하강 애니메이션
        particles.forEach((p, index) => {
          const angle = (index / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const distance = gsap.utils.random(70, 190);
          const destX = Math.cos(angle) * distance;
          const destY = Math.sin(angle) * distance * 0.7 + gsap.utils.random(20, 50); // 하강 중력감
          const rotation = gsap.utils.random(-450, 450);

          tl.to(
            p,
            {
              x: destX,
              y: destY,
              rotation: rotation,
              scale: gsap.utils.random(0.3, 1),
              opacity: 0,
              duration: gsap.utils.random(1.2, 1.8),
              ease: 'power3.out',
              onComplete: () => {
                p.remove();
              },
            },
            0
          );
        });

        // 성공 배지 등장 (출렁임 없는 부드러운 power3.out)
        if (successBadgeRef.current) {
          tl.fromTo(
            successBadgeRef.current,
            { scale: 0.88, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.38, ease: 'power3.out' },
            0.1
          );
        }
      }
    }
  }, [isMigrating, progressPercent]);

  return (
    <div
      ref={containerRef}
      data-testid="migration-pipeline-container"
      className="relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0 shadow-2xs overflow-hidden"
    >
      {/* GSAP 컨페티/폭죽 애니메이션 레이어 */}
      <div
        ref={confettiLayerRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      />

      <div className="grid grid-cols-12 items-center gap-3">
        {/* ================= 좌측: 출발 노드 ================= */}
        <div className="col-span-12 sm:col-span-5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-spotify">
              {workflowMode === 'backup_to_account'
                ? '백업 파일'
                : workflowMode === 'create_backup'
                ? '백업 대상 계정'
                : workflowMode === 'delete_account_data'
                ? '정리 대상 계정'
                : '가져올 계정'}
            </span>
            {isMigrating ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-spotify-soft text-spotify border border-spotify/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-spotify" />
                <span>
                  {workflowMode === 'create_backup'
                    ? '백업 중'
                    : workflowMode === 'delete_account_data'
                    ? '정리 중'
                    : '전송 중'}
                </span>
              </span>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {workflowMode === 'backup_to_account' ? '파일' : '출발'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* 아바타 & 펄스 링 */}
            <div className="relative shrink-0">
              <div
                ref={srcPulseRef}
                className="absolute inset-0 rounded-full bg-spotify/30 pointer-events-none opacity-0"
              />
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200 shadow-xs relative z-10">
                {workflowMode === 'backup_to_account' ? (
                  <FolderOpen className="w-4 h-4 text-spotify stroke-[1.75]" />
                ) : srcUser?.display_name ? (
                  srcUser.display_name.charAt(0).toUpperCase()
                ) : (
                  'S'
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                {workflowMode === 'backup_to_account'
                  ? selectedBackupFilename || '로컬 백업 파일'
                  : srcUser?.display_name || '출발 계정'}
              </p>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                {workflowMode === 'backup_to_account'
                  ? 'JSON 백업 아카이브'
                  : srcUser?.id || '미연결'}
              </p>
            </div>
          </div>
        </div>

        {/* ================= 중앙: GSAP 실시간 패킷 스트림 & 상태 ================= */}
        <div className="col-span-12 sm:col-span-2 flex flex-col items-center justify-center py-2 sm:py-0 relative">
          {/* 패킷 스트림 트랙 */}
          <div
            ref={streamTrackRef}
            className="w-full max-w-[120px] h-6 flex items-center justify-center relative"
          >
            {/* 배경 가이드 라인 */}
            <div
              className={`h-0.5 w-full rounded-full transition-colors duration-300 ${
                isMigrating || progressPercent === 100
                  ? 'bg-spotify/40 dark:bg-spotify/50'
                  : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            />

            {/* GSAP 패킷 컨테이너 */}
            <div
              ref={dotsContainerRef}
              aria-hidden="true"
              className="absolute inset-0 flex items-center pointer-events-none"
            >
              <span className="stream-packet absolute w-2 h-2 rounded-full bg-spotify opacity-0" />
              <span className="stream-packet absolute w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-200 opacity-0" />
              <span className="stream-packet absolute w-2 h-2 rounded-full bg-spotify opacity-0" />
              <span className="stream-packet absolute w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-200 opacity-0" />
            </div>

            {/* 중앙 진행 화살표 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 px-0.5">
              <ArrowRight
                className={`w-3.5 h-3.5 transition-colors ${
                  isMigrating || progressPercent === 100
                    ? 'text-spotify'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* 중앙 실시간 상태 텍스트 배지 */}
          <span
            className={`text-[11px] font-medium mt-1 truncate max-w-[140px] text-center transition-colors ${
              isMigrating
                ? 'text-spotify font-semibold'
                : progressPercent === 100
                ? 'text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isMigrating ? (
              workflowMode === 'create_backup' ? (
                '백업 생성 중'
              ) : workflowMode === 'delete_account_data' ? (
                '계정 정리 중'
              ) : runningTaskTitle ? (
                runningTaskTitle
              ) : (
                '데이터 전송 중'
              )
            ) : progressPercent === 100 ? (
              <>
                <Sparkles className="w-3 h-3 stroke-[2]" />
                <span>완료됨</span>
              </>
            ) : (
              '대기 중'
            )}
          </span>
        </div>

        {/* ================= 우측: 도착 노드 ================= */}
        <div className="col-span-12 sm:col-span-5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-spotify">
              {workflowMode === 'create_backup'
                ? '백업 파일 저장소'
                : workflowMode === 'delete_account_data'
                ? '정리 대상 보관함'
                : '받을 계정'}
            </span>
            {isMigrating ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-spotify-soft text-spotify border border-spotify/30">
                {workflowMode === 'create_backup'
                  ? '파일 작성 중'
                  : workflowMode === 'delete_account_data'
                  ? '삭제 처리 중'
                  : '저장 중'}
              </span>
            ) : progressPercent === 100 ? (
              <span
                ref={successBadgeRef}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                <span>
                  {workflowMode === 'create_backup'
                    ? '생성 완료'
                    : workflowMode === 'delete_account_data'
                    ? '정리 완료'
                    : '저장 완료'}
                </span>
              </span>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {workflowMode === 'create_backup'
                  ? 'backups/'
                  : workflowMode === 'delete_account_data'
                  ? '결과'
                  : '도착'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* 아바타 & 펄스 링 */}
            <div className="relative shrink-0">
              <div
                ref={dstPulseRef}
                className="absolute inset-0 rounded-full bg-spotify/30 pointer-events-none opacity-0"
              />
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200 shadow-xs relative z-10">
                {workflowMode === 'create_backup' ? (
                  <HardDrive className="w-4 h-4 text-spotify stroke-[1.75]" />
                ) : workflowMode === 'delete_account_data' ? (
                  <Trash2 className="w-4 h-4 text-rose-500 stroke-[1.75]" />
                ) : dstUser?.display_name ? (
                  dstUser.display_name.charAt(0).toUpperCase()
                ) : (
                  'D'
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                {workflowMode === 'create_backup'
                  ? 'backups/ 디렉토리'
                  : workflowMode === 'delete_account_data'
                  ? '계정 보관함'
                  : dstUser?.display_name || '새 계정'}
              </p>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                {workflowMode === 'create_backup'
                  ? 'JSON 백업 파일'
                  : workflowMode === 'delete_account_data'
                  ? '선택 항목 삭제 반영'
                  : dstUser?.id || '미연결'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 하단: GSAP 다이내믹 프로그레스 바 & 카운터 ================= */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {isMigrating && (
              <RefreshCw className="w-3.5 h-3.5 text-spotify animate-spin shrink-0 stroke-[2.2]" />
            )}
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {progressStatusText}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono">
            <span className="text-zinc-600 dark:text-zinc-400">
              추가됨:{' '}
              <strong className="text-spotify font-semibold">
                {totalMigratedItems.toLocaleString()}
              </strong>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              중복 제외:{' '}
              <strong className="text-zinc-950 dark:text-zinc-100 font-semibold">
                {totalSkippedItems.toLocaleString()}
              </strong>
            </span>
            <span className="font-semibold text-spotify">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>

        {/* GSAP 제어 커스텀 프로그레스 트랙 */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden relative shadow-inner"
        >
          {/* 바 내용물 */}
          <div
            ref={progressBarRef}
            className="h-full rounded-full bg-gradient-to-r from-spotify/90 via-spotify to-spotify-hover relative transition-none"
            style={{ width: `${progressPercent}%` }}
          >
            {/* 전송 중 훑고 지나가는 쉬머 빔 */}
            {isMigrating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-packet-flow pointer-events-none" />
            )}

            {/* 선두 진행 헤드 마커 */}
            <div
              ref={progressGlowRef}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
