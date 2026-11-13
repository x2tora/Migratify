import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';
import { StepTutorialGuide } from '../../types/spotify';
import { Tooltip } from '../Tooltip/Tooltip';

// 단계별 스텝바이스텝 모달 투어 Props 타입 정의
export interface TutorialModalProps {
  isOpen: boolean;
  guide: StepTutorialGuide;
  autoShowDisabled: boolean;
  onToggleAutoShow: (disabled: boolean) => void;
  onClose: () => void;
}

// 단계별 가이드 모달 컴포넌트 (라이트/다크 고대비 및 슬라이드 전환 애니메이션 적용)
export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  guide,
  autoShowDisabled,
  onToggleAutoShow,
  onClose,
}) => {
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const slideContentRef = useRef<HTMLDivElement | null>(null);

  // 단계 변경 시 첫 슬라이드로 초기화 및 ESC 키 입력 시 닫기
  useEffect(() => {
    setSlideIndex(0);
  }, [guide.stepIndex, isOpen]);

  // GSAP 모달 오픈 애니메이션
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
        { scale: 0.98, y: 6, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  // 슬라이드 변경 시 GSAP 전환 애니메이션
  useEffect(() => {
    if (!isOpen || !slideContentRef.current) return;
    gsap.fromTo(
      slideContentRef.current,
      { x: 8, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }
    );
  }, [slideIndex, isOpen]);

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

  const currentSlide = guide.slides[slideIndex] || guide.slides[0];
  const totalSlides = guide.slides.length;
  const isLastSlide = slideIndex === totalSlides - 1;

  // 클립보드 텍스트 복사 처리 함수
  const handleCopyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
    }
  };

  // 외부 URL 열기 처리 함수
  const handleOpenExternalUrl = async (url: string): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('외부 링크 열기 오류:', error);
    }
  };

  return (
    <div
      ref={backdropRef}
      data-od-id="step-tutorial-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 cursor-pointer"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-[610px] max-h-[90vh] rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col cursor-default"
      >
        {/* 모달 상단 헤더 (고정 높이) */}
        <div className="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span
              key={currentSlide.badge}
              className="animate-badge-pop px-2 py-0.5 rounded-md text-xs font-medium bg-spotify-soft text-spotify border border-spotify/30"
            >
              {currentSlide.badge}
            </span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {guide.stepTitle}
            </span>
          </div>

          <Tooltip content="닫기" side="left">
            <button
              type="button"
              onClick={onClose}
              aria-label="가이드 닫기"
              className="interactive-btn h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </Tooltip>
        </div>

        {/* 모달 본문 영역 (가장 큰 팝업 기준 고정 flex-1로 슬라이드 간 레이아웃 시프트 완전 방지) */}
        <div
          ref={slideContentRef}
          className="flex-1 p-6 space-y-4 overflow-y-auto"
        >
          <div>
            <h3
              id="tutorial-modal-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight"
            >
              {currentSlide.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {currentSlide.description}
            </p>
          </div>

          {/* 진행 순서 목록 */}
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
            <ul className="space-y-2.5 stagger-list">
              {currentSlide.highlights.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed"
                >
                  <span className="w-4 h-4 rounded-full bg-spotify-soft text-spotify text-[10px] font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 원클릭 복사 박스 */}
          {currentSlide.copyableText && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {currentSlide.copyableText.label}
                </p>
                <p className="text-xs font-mono font-semibold text-zinc-950 dark:text-zinc-100 truncate mt-0.5 select-all">
                  {currentSlide.copyableText.value}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(currentSlide.copyableText!.value)}
                className="interactive-btn shrink-0 h-8 px-3 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg font-semibold text-xs flex items-center gap-1.5"
              >
                {copiedValue === currentSlide.copyableText.value ? (
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
            </div>
          )}

          {/* 주의사항 박스 */}
          {currentSlide.warningBox && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 stroke-[1.75]" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {currentSlide.warningBox.title}
                </p>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                  {currentSlide.warningBox.content}
                </p>
              </div>
            </div>
          )}

          {/* 외부 대시보드 바로가기 */}
          {currentSlide.externalLink && (
            <div>
              <button
                type="button"
                onClick={() => handleOpenExternalUrl(currentSlide.externalLink!.url)}
                className="interactive-btn h-8 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <span>{currentSlide.externalLink.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-spotify stroke-[1.75]" />
              </button>
            </div>
          )}
        </div>

        {/* 모달 하단 푸터 (고정 높이로 버튼 위치 시프트 방지) */}
        <div className="h-16 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoShowDisabled}
              onChange={(e) => onToggleAutoShow(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 accent-spotify cursor-pointer"
            />
            <span>단계 이동 시 자동으로 열지 않기</span>
          </label>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              {guide.slides.map((s, idx) => (
                <button
                  key={s.stepNumber}
                  type="button"
                  aria-label={`슬라이드 ${idx + 1}`}
                  onClick={() => setSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-250 cursor-pointer ${
                    idx === slideIndex
                      ? 'w-5 bg-spotify'
                      : 'w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
                  }`}
                />
              ))}
            </div>

            {/* 이전 버튼 (1슬라이드에서는 invisible로 자리를 차지하여 다음 버튼의 가로 위치 고정) */}
            <button
              type="button"
              disabled={slideIndex === 0}
              onClick={() => setSlideIndex((prev) => Math.max(0, prev - 1))}
              className={`interactive-btn h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer transition-all ${
                slideIndex === 0 ? 'invisible pointer-events-none' : ''
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>이전</span>
            </button>

            {!isLastSlide ? (
              <button
                type="button"
                onClick={() =>
                  setSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))
                }
                className="interactive-btn h-8 w-24 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>다음 설명</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="interactive-btn h-8 w-24 rounded-lg bg-spotify hover:bg-spotify-hover text-spotify-fg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>닫기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
