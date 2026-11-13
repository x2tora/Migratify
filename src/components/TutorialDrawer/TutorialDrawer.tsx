import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  HelpCircle,
  Square,
  X,
} from 'lucide-react';
import {
  DEFAULT_REDIRECT_URI,
  COMMON_TROUBLESHOOTING_FAQS,
  STEP_TUTORIAL_GUIDES,
} from '../../data/tutorials';
import { Tooltip } from '../Tooltip/Tooltip';

// 플로팅 도움말 Drawer Props 타입 정의
export interface TutorialDrawerProps {
  isOpen: boolean;
  activeStepIndex: number;
  checklistState: Record<string, boolean>;
  onToggleChecklist: (key: string) => void;
  onClose: () => void;
}

export const QUICK_CHECKLIST_ITEMS = [
  {
    key: 'created_app',
    label:
      'Spotify Developer Dashboard에서 앱(Create app) 생성 및 [Web API]에 체크했습니다.',
  },
  {
    key: 'redirect_uri_saved',
    label:
      'Redirect URIs에 http://127.0.0.1:8888/callback 추가 후 하단 [Save]를 눌렀습니다.',
  },
  {
    key: 'user_management_added',
    label:
      '[Settings -> User Management]에 새 계정 이메일 주소를 등록했습니다.',
  },
  {
    key: 'copied_credentials',
    label: 'Client ID와 Client Secret을 입력했습니다.',
  },
];

// 우측 슬라이드 가이드 Drawer 컴포넌트
// 유저에게 불필요한 기능 홍보 문구를 모두 제거하고 실질적인 설정 순서와 오류 해결 FAQ로 구성
export const TutorialDrawer: React.FC<TutorialDrawerProps> = ({
  isOpen,
  checklistState,
  onToggleChecklist,
  onClose,
}) => {
  const [copiedUri, setCopiedUri] = useState<boolean>(false);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // GSAP 드로어 오픈 애니메이션
  useEffect(() => {
    if (!isOpen) return;
    if (backdropRef.current && drawerRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      gsap.fromTo(
        drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.28, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // ESC 키 입력 시 드로어 닫기 리스너 등록
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const apiGuide = STEP_TUTORIAL_GUIDES[0];

  // Redirect URI 복사 처리 함수
  const handleCopyRedirectUri = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DEFAULT_REDIRECT_URI);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    } catch (error) {
      console.error('URI 복사 실패:', error);
    }
  };

  // 대시보드 열기 처리 함수
  const handleOpenDashboard = async (): Promise<void> => {
    try {
      const url = 'https://developer.spotify.com/dashboard';
      if (window.electronAPI) {
        await window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('대시보드 열기 실패:', error);
    }
  };

  return (
    <div
      ref={backdropRef}
      data-od-id="floating-tutorial-drawer"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs cursor-pointer"
    >
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col cursor-default"
      >
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              단계별 사용 가이드
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              API 설정 방법 및 자주 묻는 질문
            </p>
          </div>

          <Tooltip content="닫기" side="left">
            <button
              type="button"
              onClick={onClose}
              aria-label="도움말 닫기"
              className="interactive-btn h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </Tooltip>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Redirect URI 복사 박스 */}
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Redirect URI (필수 등록 주소)
              </span>
              <button
                type="button"
                onClick={handleOpenDashboard}
                className="interactive-btn text-xs font-medium text-spotify hover:underline flex items-center gap-1"
              >
                <span>Spotify 대시보드</span>
                <ExternalLink className="w-3 h-3 stroke-[1.75]" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <code className="text-xs font-mono text-zinc-900 dark:text-zinc-100 select-all truncate">
                {DEFAULT_REDIRECT_URI}
              </code>
              <button
                type="button"
                onClick={handleCopyRedirectUri}
                className="interactive-btn shrink-0 h-7 px-2.5 rounded-md bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center gap-1"
              >
                {copiedUri ? (
                  <>
                    <Check className="w-3 h-3 stroke-[2.2] animate-check-pop" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 stroke-[1.75]" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 대시보드 설정 체크리스트 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
              대시보드 설정 확인
            </p>
            <div className="space-y-1.5 stagger-list">
              {QUICK_CHECKLIST_ITEMS.map((item) => {
                const checked = Boolean(checklistState[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleChecklist(item.key)}
                    className={`interactive-btn w-full text-left p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      checked
                        ? 'bg-spotify-soft border-spotify/40 text-zinc-950 dark:text-zinc-100'
                        : 'bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare
                        key="checked"
                        className="w-4 h-4 text-spotify shrink-0 mt-0.5 stroke-[2.2] animate-check-pop"
                      />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5 stroke-[1.75]" />
                    )}
                    <span className="leading-relaxed">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API 앱 설정 순서 */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-spotify stroke-[2]" />
              <h4 className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                Spotify Developer Dashboard 앱 설정 순서
              </h4>
            </div>

            <div className="space-y-2.5 stagger-list">
              {apiGuide.slides.map((slide) => (
                <div
                  key={slide.stepNumber}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-spotify-soft text-spotify font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {slide.stepNumber}
                    </span>
                    <h5 className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                      {slide.title}
                    </h5>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pl-7">
                    {slide.description}
                  </p>
                  <ul className="space-y-1 pt-1 pl-7">
                    {slide.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="text-xs text-zinc-700 dark:text-zinc-200 flex items-start gap-1.5"
                      >
                        <span className="text-spotify font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* 자주 묻는 질문 및 실질적 문제 해결 */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
              자주 묻는 질문 & 문제 해결
            </h4>
            <div className="space-y-2 stagger-list">
              {COMMON_TROUBLESHOOTING_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1"
                >
                  <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                    Q. {faq.question}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
