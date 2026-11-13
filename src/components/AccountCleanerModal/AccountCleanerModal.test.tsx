import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountCleanerModal } from './AccountCleanerModal';
import * as spotifyService from '../../services/spotifyService';

jest.mock('../../services/spotifyService', () => ({
  fetchLibrarySummary: jest.fn(),
  executeAccountCleanup: jest.fn(),
}));

describe('AccountCleanerModal 컴포넌트 테스트', () => {
  const mockFetchLibrarySummary = spotifyService.fetchLibrarySummary as jest.MockedFunction<
    typeof spotifyService.fetchLibrarySummary
  >;
  const mockExecuteAccountCleanup = spotifyService.executeAccountCleanup as jest.MockedFunction<
    typeof spotifyService.executeAccountCleanup
  >;

  const mockSrcUser = {
    id: 'user_src',
    display_name: '가져올 사용자',
  };
  const mockDstUser = {
    id: 'user_dst',
    display_name: '도착 사용자',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchLibrarySummary.mockResolvedValue({
      playlistsTotal: 5,
      likedSongsTotal: 120,
      savedAlbumsTotal: 12,
      followedArtistsTotal: 30,
      savedShowsTotal: 2,
    });
    mockExecuteAccountCleanup.mockResolvedValue([]);
  });

  it('모달이 열렸을 때 계정 정보와 카테고리 항목을 정상 렌더링한다', async () => {
    render(
      <AccountCleanerModal
        isOpen={true}
        onClose={jest.fn()}
        srcUser={mockSrcUser}
        dstUser={mockDstUser}
        srcToken="token_src"
        dstToken="token_dst"
      />
    );

    expect(screen.getByText('계정 데이터 삭제')).toBeInTheDocument();
    expect(screen.getByText('도착 사용자')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetchLibrarySummary).toHaveBeenCalledWith('token_dst');
    });

    expect(screen.getByText('플레이리스트')).toBeInTheDocument();
    expect(screen.getByText('좋아요 표시한 곡')).toBeInTheDocument();
  });

  it('영구 삭제 동의 체크박스를 선택해야 삭제 버튼이 활성화된다', async () => {
    render(
      <AccountCleanerModal
        isOpen={true}
        onClose={jest.fn()}
        srcUser={mockSrcUser}
        dstUser={mockDstUser}
        srcToken="token_src"
        dstToken="token_dst"
      />
    );

    await waitFor(() => {
      expect(mockFetchLibrarySummary).toHaveBeenCalled();
    });

    const submitBtn = screen.getByRole('button', { name: /삭제/i });
    expect(submitBtn).toBeDisabled();

    const agreementCheckbox = screen.getByRole('checkbox', {
      name: /영구 삭제에 동의합니다/i,
    });
    fireEvent.click(agreementCheckbox);

    expect(submitBtn).not.toBeDisabled();
  });

  it('삭제 버튼 클릭 시 executeAccountCleanup이 호출된다', async () => {
    const onFinished = jest.fn();
    render(
      <AccountCleanerModal
        isOpen={true}
        onClose={jest.fn()}
        srcUser={mockSrcUser}
        dstUser={mockDstUser}
        srcToken="token_src"
        dstToken="token_dst"
        onCleanupFinished={onFinished}
      />
    );

    await waitFor(() => {
      expect(mockFetchLibrarySummary).toHaveBeenCalled();
    });

    const agreementCheckbox = screen.getByRole('checkbox', {
      name: /영구 삭제에 동의합니다/i,
    });
    fireEvent.click(agreementCheckbox);

    const submitBtn = screen.getByRole('button', { name: /삭제/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockExecuteAccountCleanup).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token_dst',
          categories: expect.arrayContaining(['playlists', 'liked_songs']),
        })
      );
      expect(onFinished).toHaveBeenCalledWith('dst');
    });
  });

  it('삭제 전 JSON 백업 파일 자동 생성 및 보존 체크박스가 기본 체크되어 있다', async () => {
    render(
      <AccountCleanerModal
        isOpen={true}
        onClose={jest.fn()}
        srcUser={mockSrcUser}
        dstUser={mockDstUser}
        srcToken="token_src"
        dstToken="token_dst"
      />
    );

    await waitFor(() => {
      expect(mockFetchLibrarySummary).toHaveBeenCalled();
    });

    const backupCheckbox = screen.getByRole('checkbox', {
      name: /삭제 전 JSON 백업 파일 자동 생성 및 보존/i,
    });
    expect(backupCheckbox).toBeInTheDocument();
    expect(backupCheckbox).toBeChecked();
  });
});
