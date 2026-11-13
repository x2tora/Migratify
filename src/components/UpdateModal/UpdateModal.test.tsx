import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateModal } from './UpdateModal';

describe('UpdateModal', () => {
  const baseProps = {
    isOpen: true,
    isChecking: false,
    isDownloading: false,
    updateInfo: null,
    progress: null,
    downloadError: null,
    onClose: jest.fn(),
    onCheckAgain: jest.fn(),
    onStartUpdate: jest.fn(),
    onCancelDownload: jest.fn(),
    onOpenReleasePage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('최신 버전 사용 중 상태를 올바르게 표시한다', () => {
    render(
      <UpdateModal
        {...baseProps}
        updateInfo={{
          success: true,
          hasUpdate: false,
          currentVersion: '1.0.0',
          latestVersion: '1.0.0',
        }}
      />
    );

    expect(screen.getByText('최신 버전을 사용 중입니다')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('새 업데이트가 있을 때 버전 비교와 지금 업데이트 버튼을 표시하고 클릭 이벤트를 호출한다', () => {
    render(
      <UpdateModal
        {...baseProps}
        updateInfo={{
          success: true,
          hasUpdate: true,
          currentVersion: '1.0.0',
          latestVersion: '1.1.0',
          releaseName: 'v1.1.0',
          releaseNotes: '성능 개선 및 버그 수정',
          downloadUrl: 'https://github.com/x2tora/Migratify/releases/download/v1.1.0/Migratify-Setup-1.1.0.exe',
          assetName: 'Migratify-Setup-1.1.0.exe',
          assetSize: 120000000,
        }}
      />
    );

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('성능 개선 및 버그 수정')).toBeInTheDocument();

    const updateBtn = screen.getByRole('button', { name: '지금 업데이트' });
    fireEvent.click(updateBtn);
    expect(baseProps.onStartUpdate).toHaveBeenCalledTimes(1);
  });

  it('다운로드 진행 중일 때 진행률과 다운로드 취소 버튼을 표시한다', () => {
    render(
      <UpdateModal
        {...baseProps}
        isDownloading={true}
        updateInfo={{
          success: true,
          hasUpdate: true,
          currentVersion: '1.0.0',
          latestVersion: '1.1.0',
          downloadUrl: 'https://github.com/x2tora/Migratify/releases/download/v1.1.0/Migratify-Setup-1.1.0.exe',
        }}
        progress={{ percent: 45, transferred: 45 * 1024 * 1024, total: 100 * 1024 * 1024 }}
      />
    );

    expect(screen.getByText('설치 파일 다운로드 중...')).toBeInTheDocument();
    expect(screen.getByText(/45%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다운로드 취소' }));
    expect(baseProps.onCancelDownload).toHaveBeenCalledTimes(1);
  });
});
