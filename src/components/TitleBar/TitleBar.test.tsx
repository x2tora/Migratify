import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitleBar } from './TitleBar';

// TitleBar 단위 테스트
describe('TitleBar 컴포넌트 테스트', () => {
  it('현재 단계 번호와 앱 타이틀을 정상 렌더링한다', () => {
    render(
      <TitleBar
        currentStepIndex={1}
        isDarkMode={true}
        onToggleDarkMode={jest.fn()}
        onOpenStepTour={jest.fn()}
        onToggleHelpDrawer={jest.fn()}
      />
    );

    expect(screen.getByText('Migratify')).toBeInTheDocument();
    expect(screen.getByText('2단계 안내')).toBeInTheDocument();
  });

  it('단계 안내 버튼 및 사용 가이드 버튼 클릭 시 콜백 함수가 호출된다', () => {
    const onOpenStepTour = jest.fn();
    const onToggleHelpDrawer = jest.fn();

    render(
      <TitleBar
        currentStepIndex={0}
        isDarkMode={true}
        onToggleDarkMode={jest.fn()}
        onOpenStepTour={onOpenStepTour}
        onToggleHelpDrawer={onToggleHelpDrawer}
      />
    );

    fireEvent.click(screen.getByText('1단계 안내'));
    expect(onOpenStepTour).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('사용 가이드'));
    expect(onToggleHelpDrawer).toHaveBeenCalledTimes(1);
  });

  it('계정 데이터 삭제 아이콘 버튼 클릭 시 onOpenCleanerModal 콜백 함수가 호출된다', () => {
    const onOpenCleanerModal = jest.fn();

    render(
      <TitleBar
        currentStepIndex={0}
        isDarkMode={true}
        onToggleDarkMode={jest.fn()}
        onOpenStepTour={jest.fn()}
        onToggleHelpDrawer={jest.fn()}
        onOpenCleanerModal={onOpenCleanerModal}
      />
    );

    const cleanerBtn = screen.getByRole('button', { name: '계정 데이터 삭제' });
    expect(cleanerBtn).toBeInTheDocument();

    // 호버 시 아래에 계정 데이터 삭제 툴팁 표시
    fireEvent.mouseEnter(cleanerBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('계정 데이터 삭제');

    // 클릭 시 모달 열기 콜백 호출
    fireEvent.click(cleanerBtn);
    expect(onOpenCleanerModal).toHaveBeenCalledTimes(1);
  });

  it('창 최대화 버튼 클릭 시 최대화 상태가 토글되고 이전 크기로 복원 버튼으로 바뀐다', async () => {
    const maximizeMock = jest.fn().mockResolvedValue(true);
    window.electronAPI = {
      ...(window.electronAPI || {}),
      isWindowMaximized: jest.fn().mockResolvedValue(false),
      maximizeWindow: maximizeMock,
      minimizeWindow: jest.fn(),
      closeWindow: jest.fn(),
      openExternal: jest.fn(),
      getStorage: jest.fn(),
      setStorage: jest.fn(),
      clearTokens: jest.fn(),
      loginSpotify: jest.fn(),
      cancelLogin: jest.fn(),
      getAuthorizeUrl: jest.fn(),
      refreshSpotifyToken: jest.fn(),
      saveBackupFile: jest.fn(),
      openBackupFile: jest.fn(),
    };

    render(
      <TitleBar
        currentStepIndex={0}
        isDarkMode={true}
        onToggleDarkMode={jest.fn()}
        onOpenStepTour={jest.fn()}
        onToggleHelpDrawer={jest.fn()}
      />
    );

    const maxBtn = screen.getByRole('button', { name: '최대화' });
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(maximizeMock).toHaveBeenCalledTimes(1);

    // 복원 상태로 전환 확인
    expect(await screen.findByRole('button', { name: '이전 크기로 복원' })).toBeInTheDocument();
  });

  it('최소화 및 종료 버튼의 툴팁과 클릭 동작을 정상 수행한다', async () => {
    const minimizeMock = jest.fn().mockResolvedValue(true);
    const closeMock = jest.fn().mockResolvedValue(true);
    window.electronAPI = {
      ...(window.electronAPI || {}),
      isWindowMaximized: jest.fn().mockResolvedValue(false),
      minimizeWindow: minimizeMock,
      closeWindow: closeMock,
      maximizeWindow: jest.fn(),
      openExternal: jest.fn(),
      getStorage: jest.fn(),
      setStorage: jest.fn(),
      clearTokens: jest.fn(),
      loginSpotify: jest.fn(),
      cancelLogin: jest.fn(),
      getAuthorizeUrl: jest.fn(),
      refreshSpotifyToken: jest.fn(),
      saveBackupFile: jest.fn(),
      openBackupFile: jest.fn(),
    };

    render(
      <TitleBar
        currentStepIndex={0}
        isDarkMode={true}
        onToggleDarkMode={jest.fn()}
        onOpenStepTour={jest.fn()}
        onToggleHelpDrawer={jest.fn()}
      />
    );

    const minBtn = screen.getByRole('button', { name: '최소화' });
    expect(minBtn).toBeInTheDocument();
    fireEvent.mouseEnter(minBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('최소화');
    fireEvent.mouseLeave(minBtn);
    fireEvent.click(minBtn);
    expect(minimizeMock).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: '종료' });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.mouseEnter(closeBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('종료');
    fireEvent.mouseLeave(closeBtn);
    fireEvent.click(closeBtn);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
