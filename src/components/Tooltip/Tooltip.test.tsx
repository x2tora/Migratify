import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, GlobalTooltipProvider } from './Tooltip';

describe('Tooltip 컴포넌트 단위 테스트', () => {
  it('자식 요소 호버 시 딜레이 없이 툴팁 팝업이 표시된다', () => {
    render(
      <Tooltip content="계정 데이터 삭제" side="bottom">
        <button type="button">삭제</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: '삭제' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // 마우스 호버 (진입)
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('계정 데이터 삭제')).toBeInTheDocument();

    // 마우스 이탈
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('GlobalTooltipProvider는 data-tooltip 속성을 가진 요소 호버 시 툴팁을 표시한다', () => {
    render(
      <GlobalTooltipProvider>
        <div>
          <button type="button" data-tooltip="새로고침">
            새로고침 버튼
          </button>
        </div>
      </GlobalTooltipProvider>
    );

    const btn = screen.getByText('새로고침 버튼');
    fireEvent.mouseOver(btn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('새로고침');

    fireEvent.mouseOut(btn);
  });
});
