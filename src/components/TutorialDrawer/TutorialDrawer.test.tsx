import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialDrawer } from './TutorialDrawer';

// TutorialDrawer 단위 테스트
describe('TutorialDrawer 컴포넌트 테스트', () => {
  it('체크리스트 항목을 렌더링하고 클릭 시 onToggleChecklist를 호출한다', () => {
    const onToggleChecklist = jest.fn();
    render(
      <TutorialDrawer
        isOpen={true}
        activeStepIndex={0}
        checklistState={{}}
        onToggleChecklist={onToggleChecklist}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('단계별 사용 가이드')).toBeInTheDocument();

    fireEvent.click(
      screen.getByText(
        'Spotify Developer Dashboard에서 앱(Create app) 생성 및 [Web API]에 체크했습니다.'
      )
    );
    expect(onToggleChecklist).toHaveBeenCalledWith('created_app');
  });

  it('X 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = jest.fn();
    render(
      <TutorialDrawer
        isOpen={true}
        activeStepIndex={0}
        checklistState={{}}
        onToggleChecklist={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '도움말 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('빈 공간(배경) 클릭 시 onClose가 호출된다', () => {
    const onClose = jest.fn();
    render(
      <TutorialDrawer
        isOpen={true}
        activeStepIndex={0}
        checklistState={{}}
        onToggleChecklist={jest.fn()}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC 키를 누르면 onClose가 호출된다', () => {
    const onClose = jest.fn();
    render(
      <TutorialDrawer
        isOpen={true}
        activeStepIndex={0}
        checklistState={{}}
        onToggleChecklist={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
