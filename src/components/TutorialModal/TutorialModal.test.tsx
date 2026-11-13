import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialModal } from './TutorialModal';
import { STEP_TUTORIAL_GUIDES } from '../../data/tutorials';

// TutorialModal 단위 테스트
describe('TutorialModal 컴포넌트 테스트', () => {
  it('첫 번째 슬라이드 제목과 다음 설명 버튼을 렌더링하고 슬라이드를 전환한다', () => {
    const onClose = jest.fn();
    render(
      <TutorialModal
        isOpen={true}
        guide={STEP_TUTORIAL_GUIDES[0]}
        autoShowDisabled={false}
        onToggleAutoShow={jest.fn()}
        onClose={onClose}
      />
    );

    expect(
      screen.getByText('Spotify Developer Dashboard에서 앱 만들기')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('다음 설명'));
    expect(
      screen.getByText('Redirect URIs에 로컬 콜백 주소 추가 후 저장')
    ).toBeInTheDocument();
  });

  it('X 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = jest.fn();
    render(
      <TutorialModal
        isOpen={true}
        guide={STEP_TUTORIAL_GUIDES[0]}
        autoShowDisabled={false}
        onToggleAutoShow={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '가이드 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('빈 공간(배경) 클릭 시 onClose가 호출된다', () => {
    const onClose = jest.fn();
    render(
      <TutorialModal
        isOpen={true}
        guide={STEP_TUTORIAL_GUIDES[0]}
        autoShowDisabled={false}
        onToggleAutoShow={jest.fn()}
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
      <TutorialModal
        isOpen={true}
        guide={STEP_TUTORIAL_GUIDES[0]}
        autoShowDisabled={false}
        onToggleAutoShow={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
