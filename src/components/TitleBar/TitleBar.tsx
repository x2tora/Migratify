import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  BookOpen,
  HelpCircle,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { APP_ICON_DATA_URL } from '../../assets_icon';
import { Tooltip } from '../Tooltip/Tooltip';

// 타이틀바 컴포넌트 Props 타입 정의
export interface TitleBarProps {
  currentStepIndex: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenStepTour?: () => void;
  onToggleHelpDrawer: () => void;
  onOpenCleanerModal?: () => void;
  appVersion?: string;
  hasAvailableUpdate?: boolean;
  onOpenUpdateModal?: () => void;
}

// 프레임리스 윈도우 타이틀바 컴포넌트 (라이트/다크 고대비 및 마이크로 인터랙션 적용)
export const TitleBar: React.FC<TitleBarProps> = ({
  currentStepIndex,
  isDarkMode,
  onToggleDarkMode,
  onOpenStepTour,
  onToggleHelpDrawer,
  onOpenCleanerModal,
  appVersion = '1.0.0',
  hasAvailableUpdate = false,
  onOpenUpdateModal,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const titlebarRef = useRef<HTMLElement | null>(null);

  // 타이틀바 마운트 시 GSAP 부드러운 등장 모션
  useEffect(() => {
    if (!titlebarRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titlebarRef.current,
        { opacity: 0, y: -4 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
      );
    }, titlebarRef);
    return () => ctx.revert();
  }, []);

  // 창 최대화 상태 동기화 및 실시간 IPC 이벤트 구독
  useEffect(() => {
    try {
      window.electronAPI?.isWindowMaximized?.().then((maximized) => {
        setIsMaximized(Boolean(maximized));
      });
      const unsubscribe = window.electronAPI?.onWindowMaximizedChange?.((maximized) => {
        setIsMaximized(maximized);
      });
      return () => {
        unsubscribe?.();
      };
    } catch (error) {
      console.error('창 최대화 상태 동기화 오류:', error);
    }
  }, []);

  // 창 최소화 처리 함수
  const handleMinimize = async (): Promise<void> => {
    try {
      await window.electronAPI?.minimizeWindow();
    } catch (error) {
      console.error('창 최소화 실패:', error);
    }
  };

  // 창 최대화 및 이전 크기 복원 토글 처리 함수
  const handleMaximize = async (): Promise<void> => {
    try {
      const result = await window.electronAPI?.maximizeWindow();
      if (typeof result === 'boolean') {
        setIsMaximized(result);
      }
    } catch (error) {
      console.error('창 최대화 실패:', error);
    }
  };

  // 창 닫기 처리 함수
  const handleClose = async (): Promise<void> => {
    try {
      await window.electronAPI?.closeWindow();
    } catch (error) {
      console.error('창 닫기 실패:', error);
    }
  };

  return (
    <header
      ref={titlebarRef}
      data-od-id="studio-titlebar"
      className="app-drag-region h-12 px-2.5 flex items-center justify-between border-b border-theme-border bg-theme-titlebar select-none shrink-0 transition-colors duration-250"
    >
      {/* 좌측 앱 타이틀 및 브랜드 아이콘 */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-700/80 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
          <img
            src={APP_ICON_DATA_URL}
            alt="App Icon"
            className="w-4 h-4 object-contain shrink-0"
          />
        </div>
        <span className="text-xs font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
          Migratify
        </span>
        {onOpenUpdateModal ? (
          <Tooltip
            content={hasAvailableUpdate ? '새 업데이트 사용 가능 (클릭하여 업데이트)' : '업데이트 확인'}
            side="bottom"
          >
            <button
              type="button"
              onClick={onOpenUpdateModal}
              aria-label="업데이트 확인"
              className={`app-no-drag interactive-btn px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1.5 transition-colors ${
                hasAvailableUpdate
                  ? 'bg-spotify-soft border-spotify/50 text-spotify font-semibold'
                  : 'bg-zinc-50 hover:bg-zinc-200/70 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>v{appVersion}</span>
              {hasAvailableUpdate && (
                <span className="w-1.5 h-1.5 rounded-full bg-spotify" />
              )}
            </button>
          </Tooltip>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
            v{appVersion}
          </span>
        )}
      </div>

      {/* 우측 유틸리티 버튼 및 창 제어 */}
      <div className="app-no-drag flex items-center gap-1.5">
        {onOpenStepTour && (
          <Tooltip content={`${currentStepIndex + 1}단계 안내 보기`} side="bottom">
            <button
              type="button"
              onClick={onOpenStepTour}
              aria-label={`${currentStepIndex + 1}단계 안내`}
              className="interactive-btn h-7 px-2.5 rounded-md text-xs font-medium bg-zinc-50 hover:bg-zinc-200/70 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
              <span key={currentStepIndex} className="animate-badge-pop">
                {currentStepIndex + 1}단계 안내
              </span>
            </button>
          </Tooltip>
        )}

        {/* 계정 데이터 삭제 쓰레기통 아이콘 버튼 (사용 가이드 좌측에 배치) */}
        {onOpenCleanerModal && (
          <Tooltip content="계정 데이터 삭제" side="bottom">
            <button
              type="button"
              onClick={onOpenCleanerModal}
              aria-label="계정 데이터 삭제"
              className="interactive-btn h-7 w-7 rounded-md text-xs font-medium bg-zinc-50 hover:bg-rose-50/70 hover:border-rose-300 dark:bg-zinc-900 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/60 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </Tooltip>
        )}

        <Tooltip content="사용 가이드 (F1)" side="bottom">
          <button
            type="button"
            onClick={onToggleHelpDrawer}
            aria-label="사용 가이드"
            className="interactive-btn h-7 px-2.5 rounded-md text-xs font-medium bg-zinc-50 hover:bg-zinc-200/70 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
            <span>사용 가이드</span>
            <kbd className="hidden sm:inline-block px-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded">
              F1
            </kbd>
          </button>
        </Tooltip>

        <Tooltip
          content={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          side="bottom"
        >
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="테마 전환"
            className="interactive-btn h-7 w-7 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
          >
            {isDarkMode ? (
              <Sun
                key="sun"
                className="w-3.5 h-3.5 text-spotify animate-icon-morph stroke-[1.75]"
              />
            ) : (
              <Moon
                key="moon"
                className="w-3.5 h-3.5 text-spotify animate-icon-morph stroke-[1.75]"
              />
            )}
          </button>
        </Tooltip>

        <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <Tooltip content="최소화" side="bottom">
          <button
            type="button"
            onClick={handleMinimize}
            aria-label="최소화"
            className="interactive-btn h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900"
          >
            <Minus className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>
        </Tooltip>

        <Tooltip content={isMaximized ? '이전 크기로 복원' : '최대화'} side="bottom">
          <button
            type="button"
            onClick={handleMaximize}
            aria-label={isMaximized ? '이전 크기로 복원' : '최대화'}
            className="interactive-btn h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 stroke-[1.75]" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 stroke-[1.75]" />
            )}
          </button>
        </Tooltip>

        <Tooltip content="종료" side="bottom">
          <button
            type="button"
            onClick={handleClose}
            aria-label="종료"
            className="interactive-btn h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-rose-600 hover:text-white dark:text-zinc-400"
          >
            <X className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
