import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

// 툴팁 노출 방향 타입 정의
export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

// 툴팁 정렬 타입 정의
export type TooltipAlign = 'start' | 'center' | 'end';

// 툴팁 컴포넌트 Props 타입 정의
export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  delay?: number;
  disabled?: boolean;
  className?: string;
  children: ReactElement;
}

// 툴팁 좌표 및 실제 배치 방향 인터페이스
interface TooltipPosition {
  top: number;
  left: number;
  side: TooltipSide;
}

// 화면 경계 여백 상수 (px)
const SCREEN_PADDING = 8;
const ARROW_OFFSET = 6;

// 단일 요소 래퍼용 툴팁 컴포넌트 (딜레이 0ms 즉각 노출 및 화면 경계 클램핑 지원)
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'bottom',
  align = 'center',
  delay = 0,
  disabled = false,
  className = '',
  children,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // 툴팁 절대 좌표 계산 함수
  const updatePosition = useCallback((): void => {
    try {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      let calculatedSide = side;
      let targetTop = 0;
      let targetLeft = 0;

      // 1. 방향별 기준 좌표 계산
      if (side === 'bottom') {
        targetTop = rect.bottom + ARROW_OFFSET;
        if (align === 'start') targetLeft = rect.left;
        else if (align === 'end') targetLeft = rect.right;
        else targetLeft = rect.left + rect.width / 2;

        // 화면 하단 초과 시 상단으로 반전
        if (targetTop + 36 > window.innerHeight) {
          calculatedSide = 'top';
          targetTop = rect.top - ARROW_OFFSET;
        }
      } else if (side === 'top') {
        targetTop = rect.top - ARROW_OFFSET;
        if (align === 'start') targetLeft = rect.left;
        else if (align === 'end') targetLeft = rect.right;
        else targetLeft = rect.left + rect.width / 2;

        // 화면 상단 초과 시 하단으로 반전
        if (targetTop - 36 < 0) {
          calculatedSide = 'bottom';
          targetTop = rect.bottom + ARROW_OFFSET;
        }
      } else if (side === 'left') {
        targetLeft = rect.left - ARROW_OFFSET;
        targetTop = rect.top + rect.height / 2;
        // 화면 좌측 초과 시 우측으로 반전
        if (targetLeft - 100 < 0) {
          calculatedSide = 'right';
          targetLeft = rect.right + ARROW_OFFSET;
        }
      } else if (side === 'right') {
        targetLeft = rect.right + ARROW_OFFSET;
        targetTop = rect.top + rect.height / 2;
        // 화면 우측 초과 시 좌측으로 반전
        if (targetLeft + 100 > window.innerWidth) {
          calculatedSide = 'left';
          targetLeft = rect.left - ARROW_OFFSET;
        }
      }

      setPosition({
        top: targetTop + scrollY,
        left: targetLeft + scrollX,
        side: calculatedSide,
      });
    } catch (error) {
      console.error('툴팁 위치 계산 오류:', error);
    }
  }, [side, align]);

  // 마우스 진입 및 포커스 시 즉시 툴팁 표시 처리 함수
  const handleOpen = (): void => {
    try {
      if (disabled || !content) return;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (delay <= 0) {
        updatePosition();
        setIsOpen(true);
      } else {
        timeoutRef.current = window.setTimeout(() => {
          updatePosition();
          setIsOpen(true);
        }, delay);
      }
    } catch (error) {
      console.error('툴팁 열기 오류:', error);
    }
  };

  // 마우스 이탈 및 포커스 아웃 시 툴팁 숨김 처리 함수
  const handleClose = (): void => {
    try {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsOpen(false);
    } catch (error) {
      console.error('툴팁 닫기 오류:', error);
    }
  };

  // 툴팁 활성화 상태에서 윈도우 스크롤 또는 리사이즈 시 위치 동기화
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = (): void => {
      updatePosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 자식 컴포넌트에 이벤트 및 ref 바인딩
  const child = React.Children.only(children) as ReactElement<any>;
  const clonedChild = React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const { ref } = child as any;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as any).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleOpen();
      child.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleClose();
      child.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleOpen();
      child.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleClose();
      child.props.onBlur?.(e);
    },
  });

  // 툴팁 포털 DOM 렌더링
  const renderTooltipPortal = (): ReactNode => {
    if (!isOpen || !position || disabled || !content) return null;

    // 변환(transform) 스타일 계산 (수평/수직 중앙 정렬)
    let transformClass = '';
    if (position.side === 'bottom') {
      transformClass =
        align === 'start'
          ? 'translate-x-0'
          : align === 'end'
          ? '-translate-x-full'
          : '-translate-x-1/2';
    } else if (position.side === 'top') {
      transformClass =
        align === 'start'
          ? '-translate-y-full'
          : align === 'end'
          ? '-translate-x-full -translate-y-full'
          : '-translate-x-1/2 -translate-y-full';
    } else if (position.side === 'left') {
      transformClass = '-translate-x-full -translate-y-1/2';
    } else if (position.side === 'right') {
      transformClass = 'translate-x-0 -translate-y-1/2';
    }

    return createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        className={`fixed z-[99999] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-100 ${transformClass}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div
          className={`relative px-2.5 py-1 text-[11px] font-medium leading-normal rounded-md shadow-md border whitespace-nowrap bg-white text-zinc-800 border-zinc-200/90 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-700/90 ${className}`}
        >
          {content}

          {/* 화살표(말풍선 꼬리) 렌더링 */}
          {position.side === 'bottom' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-zinc-200/90 dark:border-b-zinc-700/90" />
          )}
          {position.side === 'top' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-200/90 dark:border-t-zinc-700/90" />
          )}
          {position.side === 'left' && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-zinc-200/90 dark:border-l-zinc-700/90" />
          )}
          {position.side === 'right' && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-zinc-200/90 dark:border-r-zinc-700/90" />
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {clonedChild}
      {renderTooltipPortal()}
    </>
  );
};

// ============================================================================
// 전역 Tooltip Provider: 앱 전체의 data-tooltip 및 title 속성을 감지하여
// 딜레이 없이 일관된 자체 디자인 팝업을 표시하는 전역 리스너 컴포넌트
// ============================================================================
export const GlobalTooltipProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    text: string;
    top: number;
    left: number;
    side: TooltipSide;
    transformClass: string;
  } | null>(null);

  useEffect(() => {
    // 마우스가 올라간 요소 탐색 및 툴팁 표시
    const handleMouseOver = (e: MouseEvent): void => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // data-tooltip 또는 title 속성을 가진 가장 가까운 요소 검색
        const tooltipEl = target.closest(
          '[data-tooltip], [title]'
        ) as HTMLElement | null;

        if (!tooltipEl) {
          setActiveTooltip(null);
          return;
        }

        // 브라우저 기본 노란색 사각형 툴팁 차단을 위해 title을 data-tooltip으로 안전하게 변환
        let tooltipText = tooltipEl.getAttribute('data-tooltip');
        const rawTitle = tooltipEl.getAttribute('title');
        if (rawTitle) {
          tooltipText = rawTitle;
          tooltipEl.setAttribute('data-tooltip', rawTitle);
          tooltipEl.removeAttribute('title');
        }

        if (!tooltipText || !tooltipText.trim()) {
          setActiveTooltip(null);
          return;
        }

        const rect = tooltipEl.getBoundingClientRect();
        const sideAttr = (tooltipEl.getAttribute('data-tooltip-side') ||
          'bottom') as TooltipSide;
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;

        let calculatedSide = sideAttr;
        let top = 0;
        let left = 0;
        let transformClass = '';

        if (sideAttr === 'bottom') {
          top = rect.bottom + ARROW_OFFSET;
          left = rect.left + rect.width / 2;
          transformClass = '-translate-x-1/2';
          if (top + 36 > window.innerHeight) {
            calculatedSide = 'top';
            top = rect.top - ARROW_OFFSET;
            transformClass = '-translate-x-1/2 -translate-y-full';
          }
        } else if (sideAttr === 'top') {
          top = rect.top - ARROW_OFFSET;
          left = rect.left + rect.width / 2;
          transformClass = '-translate-x-1/2 -translate-y-full';
          if (top - 36 < 0) {
            calculatedSide = 'bottom';
            top = rect.bottom + ARROW_OFFSET;
            transformClass = '-translate-x-1/2';
          }
        } else if (sideAttr === 'left') {
          top = rect.top + rect.height / 2;
          left = rect.left - ARROW_OFFSET;
          transformClass = '-translate-x-full -translate-y-1/2';
        } else if (sideAttr === 'right') {
          top = rect.top + rect.height / 2;
          left = rect.right + ARROW_OFFSET;
          transformClass = 'translate-x-0 -translate-y-1/2';
        }

        // 화면 좌우 경계 클램프
        const clampedLeft = Math.max(
          SCREEN_PADDING + 40,
          Math.min(window.innerWidth - SCREEN_PADDING - 40, left)
        );

        setActiveTooltip({
          text: tooltipText,
          top: top + scrollY,
          left: clampedLeft + scrollX,
          side: calculatedSide,
          transformClass,
        });
      } catch (error) {
        console.error('전역 툴팁 마우스오버 처리 오류:', error);
      }
    };

    // 마우스 이탈 시 툴팁 닫기
    const handleMouseOut = (e: MouseEvent): void => {
      try {
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (!relatedTarget || !relatedTarget.closest('[data-tooltip], [title]')) {
          setActiveTooltip(null);
        }
      } catch (error) {
        console.error('전역 툴팁 마우스아웃 처리 오류:', error);
      }
    };

    const handleWindowBlur = (): void => {
      setActiveTooltip(null);
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return (
    <>
      {children}
      {activeTooltip &&
        createPortal(
          <div
            role="tooltip"
            data-od-id="global-custom-tooltip"
            className={`fixed z-[99999] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-75 ${activeTooltip.transformClass}`}
            style={{
              top: `${activeTooltip.top}px`,
              left: `${activeTooltip.left}px`,
            }}
          >
            <div className="relative px-2.5 py-1 text-[11px] font-medium leading-normal rounded-md shadow-md border whitespace-nowrap bg-white text-zinc-800 border-zinc-200/90 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-700/90">
              {activeTooltip.text}

              {/* 화살표(말풍선 꼬리) 렌더링 */}
              {activeTooltip.side === 'bottom' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-zinc-200/90 dark:border-b-zinc-700/90" />
              )}
              {activeTooltip.side === 'top' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-200/90 dark:border-t-zinc-700/90" />
              )}
              {activeTooltip.side === 'left' && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-zinc-200/90 dark:border-l-zinc-700/90" />
              )}
              {activeTooltip.side === 'right' && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-zinc-200/90 dark:border-r-zinc-700/90" />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
