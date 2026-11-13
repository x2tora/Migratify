import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Check,
  ExternalLink,
  KeyRound,
  Layers,
  Play,
  Users,
} from 'lucide-react';
import { SpotifyUserProfile, WorkflowMode } from '../../types/spotify';
import { Tooltip } from '../Tooltip/Tooltip';

// 사이드바 컴포넌트 Props 타입 정의
export interface SidebarProps {
  currentStep: number;
  maxReachedStep: number;
  srcUser: SpotifyUserProfile | null;
  dstUser: SpotifyUserProfile | null;
  hasBackupLoaded: boolean;
  workflowMode?: WorkflowMode;
  onSelectStep: (stepIndex: number) => void;
  onOpenStepTutorial?: () => void;
  onOpenCleanerModal?: () => void;
}

const WORKFLOW_STEPS = [
  {
    index: 0,
    title: 'API 자격 증명',
    desc: '스포티파이 개발자 키 입력',
    Icon: KeyRound,
  },
  {
    index: 1,
    title: '계정 연결',
    desc: '기존 계정과 새 계정 로그인',
    Icon: Users,
  },
  {
    index: 2,
    title: '이전 항목 선택',
    desc: '플레이리스트·곡·앨범 선택',
    Icon: Layers,
  },
  {
    index: 3,
    title: '데이터 이전',
    desc: '새 계정으로 음악 옮기기',
    Icon: Play,
  },
];

// 좌측 단계 네비게이션 및 연결 상태 사이드바 컴포넌트 (단계 진행 애니메이션 및 라이트/다크 고대비 적용)
export const Sidebar: React.FC<SidebarProps> = ({
  currentStep,
  maxReachedStep,
  srcUser,
  dstUser,
  hasBackupLoaded,
  workflowMode = 'account_to_account',
  onSelectStep,
  onOpenStepTutorial,
  onOpenCleanerModal,
}) => {
  // 모드별 단계 상세 설명 반환 함수
  const getStepDesc = (stepIndex: number, defaultDesc: string): string => {
    if (stepIndex === 1) {
      if (workflowMode === 'create_backup') return '백업할 계정 로그인';
      if (workflowMode === 'delete_account_data') return '정리할 계정 로그인';
      if (workflowMode === 'backup_to_account') return '백업 파일 및 새 계정';
      return '기존 계정과 새 계정 로그인';
    }
    if (stepIndex === 2) {
      if (workflowMode === 'create_backup') return '백업할 항목 선택';
      if (workflowMode === 'delete_account_data') return '삭제할 항목 선택';
      return '플레이리스트·곡·앨범 선택';
    }
    if (stepIndex === 3) {
      if (workflowMode === 'create_backup') return '백업 파일 생성 및 저장';
      if (workflowMode === 'delete_account_data') return '선택한 계정 데이터 삭제';
      return '새 계정으로 음악 옮기기';
    }
    return defaultDesc;
  };

  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const activeIconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sidebarRef = useRef<HTMLElement | null>(null);

  // 단계 변경 시 GSAP 프로그레스 바 및 활성 아이콘 애니메이션 (출렁임 없는 탄탄한 power2.out)
  useEffect(() => {
    if (progressBarRef.current) {
      const pct = ((currentStep + 1) / 4) * 100;
      gsap.to(progressBarRef.current, {
        width: `${pct}%`,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    const currentIcon = activeIconRefs.current[currentStep];
    if (currentIcon) {
      gsap.fromTo(
        currentIcon,
        { scale: 0.92, opacity: 0.9 },
        { scale: 1, opacity: 1, duration: 0.22, ease: 'power2.out', overwrite: 'auto' }
      );
    }
  }, [currentStep]);

  // 마운트 시 사이드바 요소 부드러운 GSAP 페이드인
  useEffect(() => {
    if (!sidebarRef.current) return;
    const ctx = gsap.context(() => {
      const items = sidebarRef.current?.querySelectorAll<HTMLElement>('.sidebar-item');
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, x: -6 },
          { opacity: 1, x: 0, duration: 0.22, stagger: 0.03, ease: 'power2.out' }
        );
      }
    }, sidebarRef);
    return () => ctx.revert();
  }, []);

  // 단계 클릭 처리 함수
  const handleStepClick = (idx: number): void => {
    try {
      if (idx <= maxReachedStep) {
        onSelectStep(idx);
      }
    } catch (error) {
      console.error('단계 이동 실패:', error);
    }
  };

  return (
    <aside
      ref={sidebarRef}
      data-od-id="studio-sidebar"
      className="w-64 shrink-0 border-r border-theme-border bg-theme-inset flex flex-col justify-between p-2.5 transition-colors duration-250 overflow-y-auto"
    >
      {/* 상단 워크플로우 단계 목록 */}
      <div className="space-y-4">
        <div className="px-2 pt-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            진행 단계
          </h2>
          <span className="text-[11px] font-mono text-spotify font-semibold">
            {currentStep + 1} / 4
          </span>
        </div>

        {/* 단계 전체 진행도 GSAP 프로그레스 바 */}
        <div className="px-2">
          <div
            role="progressbar"
            aria-valuenow={((currentStep + 1) / 4) * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden relative"
          >
            <div
              ref={progressBarRef}
              className="h-full rounded-full bg-spotify"
              style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        <nav className="space-y-1.5 stagger-list" aria-label="마이그레이션 단계">
          {WORKFLOW_STEPS.map(({ index, title, desc, Icon }) => {
            const isActive = currentStep === index;
            const isCompleted = index < currentStep;
            const isReachable = index <= maxReachedStep;

            return (
              <button
                key={index}
                type="button"
                disabled={!isReachable}
                onClick={() => handleStepClick(index)}
                aria-current={isActive ? 'step' : undefined}
                className={`sidebar-item interactive-btn w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 border-spotify shadow-xs'
                    : isReachable
                    ? 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-zinc-900/60 cursor-pointer'
                    : 'bg-transparent border-transparent opacity-45 cursor-not-allowed'
                }`}
              >
                <div
                  ref={(el) => {
                    activeIconRefs.current[index] = el;
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                    isActive
                      ? 'bg-spotify text-spotify-fg shadow-xs'
                      : isCompleted
                      ? 'bg-spotify-soft text-spotify'
                      : isReachable
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-700'
                      : 'bg-zinc-200/70 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {isCompleted ? (
                    <Check
                      key={`check-${index}`}
                      className="w-3.5 h-3.5 stroke-[2.4] animate-check-pop"
                    />
                  ) : (
                    <Icon className="w-3.5 h-3.5 stroke-[1.85]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-semibold truncate transition-colors ${
                        isActive
                          ? 'text-zinc-950 dark:text-zinc-100'
                          : isReachable
                          ? 'text-zinc-800 dark:text-zinc-300'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {index + 1}. {title}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {getStepDesc(index, desc)}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 하단 계정 연결 요약 및 튜토리얼 버튼 */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 transition-colors duration-250">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {workflowMode === 'create_backup' || workflowMode === 'delete_account_data'
                ? '대상 계정'
                : '연결된 계정'}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {workflowMode === 'backup_to_account' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                    백업 파일
                  </span>
                  <span
                    className={`font-semibold truncate animate-badge-pop ${
                      hasBackupLoaded
                        ? 'text-spotify'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {hasBackupLoaded
                      ? `${srcUser?.display_name || '파일'} (선택됨)`
                      : '미선택'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                    받을 계정
                  </span>
                  <span
                    key={dstUser?.id || 'dst-none'}
                    className={`font-semibold truncate animate-badge-pop ${
                      dstUser
                        ? 'text-zinc-950 dark:text-zinc-100'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {dstUser ? dstUser.display_name : '미연결'}
                  </span>
                </div>
              </>
            ) : workflowMode === 'create_backup' ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                  백업할 계정
                </span>
                <span
                  key={srcUser?.id || 'src-none'}
                  className={`font-semibold truncate animate-badge-pop ${
                    srcUser
                      ? 'text-zinc-950 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {srcUser ? srcUser.display_name : '미연결'}
                </span>
              </div>
            ) : workflowMode === 'delete_account_data' ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                  정리할 계정
                </span>
                <span
                  key={srcUser?.id || 'src-none'}
                  className={`font-semibold truncate animate-badge-pop ${
                    srcUser
                      ? 'text-zinc-950 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {srcUser ? srcUser.display_name : '미연결'}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                    가져올 계정
                  </span>
                  <span
                    key={srcUser?.id || 'src-none'}
                    className={`font-semibold truncate animate-badge-pop ${
                      srcUser
                        ? 'text-zinc-950 dark:text-zinc-100'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {srcUser
                      ? `${srcUser.display_name}${hasBackupLoaded ? ' (백업)' : ''}`
                      : '미연결'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                    받을 계정
                  </span>
                  <span
                    key={dstUser?.id || 'dst-none'}
                    className={`font-semibold truncate animate-badge-pop ${
                      dstUser
                        ? 'text-zinc-950 dark:text-zinc-100'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {dstUser ? dstUser.display_name : '미연결'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 제작자 크레딧 및 xitora.cc 바로가기 */}
        <div className="pt-1 px-1 flex items-center justify-between text-xs select-none">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">
            Made by <span className="font-semibold text-zinc-800 dark:text-zinc-200">xitora</span>
          </span>
          <Tooltip content="xitora.cc 공식 홈페이지 방문" side="top">
            <button
              type="button"
              onClick={() => window.electronAPI?.openExternal('https://xitora.cc')}
              className="interactive-btn text-spotify hover:text-spotify-hover dark:text-spotify dark:hover:text-spotify-hover font-semibold flex items-center gap-1 group cursor-pointer"
              aria-label="xitora.cc 공식 홈페이지 방문"
            >
              <span>xitora.cc</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};
