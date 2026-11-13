import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from './App';

// App 통합 단위 테스트
describe('App 메인 컴포넌트 테스트', () => {
  it('1단계 API 자격 증명 화면과 필수 Redirect URI를 렌더링한다', () => {
    render(<App />);
    expect(
      screen.getByText('Spotify API 자격 증명 설정')
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('http://127.0.0.1:8888/callback').length
    ).toBeGreaterThan(0);
  });

  it('Client ID 또는 Secret이 비어 있을 때 다음 단계 클릭 시 오류 메시지를 표시한다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(
      screen.getByText(
        'Spotify 앱의 Client ID와 Client Secret을 모두 입력해 주세요.'
      )
    ).toBeInTheDocument();
  });

  it('2단계 진입 시 4가지 작업 선택지를 제공하고 구형 백업 버튼들이 제거되어 있다', async () => {
    render(<App />);
    const idInput = screen.getByPlaceholderText('32자리 Client ID 입력');
    const secretInput = screen.getByPlaceholderText('32자리 Client Secret 입력');
    fireEvent.change(idInput, { target: { value: 'test_client_id_123456789012' } });
    fireEvent.change(secretInput, { target: { value: 'test_client_secret_123456789012' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    // 4가지 선택지 비동기 전환 확인
    await waitFor(() => {
      expect(screen.getByText('계정 > 계정 전송')).toBeInTheDocument();
    });
    expect(screen.getByText('백업 파일 > 계정 전송')).toBeInTheDocument();
    expect(screen.getByText('백업 파일(JSON) 생성')).toBeInTheDocument();
    expect(screen.getByText('계정 데이터 삭제')).toBeInTheDocument();

    // 기존 계정 연결 단계의 구형 백업 파일 불러오기 버튼이 없어야 함
    expect(screen.queryByText('기존 백업 파일(JSON) 불러오기')).not.toBeInTheDocument();

    // 2번 모드(백업 파일 > 계정 전송) 클릭 시 시각화된 백업 보관함 렌더링 확인
    fireEvent.click(screen.getByText('백업 파일 > 계정 전송'));
    expect(screen.getByText('백업 파일 보관함')).toBeInTheDocument();
    expect(screen.getByText('외부 백업 파일(JSON) 찾아보기')).toBeInTheDocument();

    // 3번 모드(백업 파일 생성) 클릭 시 백업 저장소 안내 카드 렌더링 확인
    fireEvent.click(screen.getByText('백업 파일(JSON) 생성'));
    expect(screen.getByText('백업 파일 저장소')).toBeInTheDocument();
    expect(screen.getByText('백업 저장 폴더 열기')).toBeInTheDocument();

    // 4번 모드(계정 데이터 삭제) 클릭 시 주의사항 카드 렌더링 확인
    fireEvent.click(screen.getByText('계정 데이터 삭제'));
    expect(screen.getByText('데이터 정리 주의사항')).toBeInTheDocument();

    // 로그인하지 않은 상태에서 4단계 이동 시도 시 계정 로그인 안내 메시지 검증
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => {
      expect(
        screen.getByText(/정리할 계정 연결 오류/)
      ).toBeInTheDocument();
    });

    // 3번 모드(백업 파일 생성) 선택 후 로그인하지 않고 다음 클릭 시 오류 검증
    fireEvent.click(screen.getByText('백업 파일(JSON) 생성'));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => {
      expect(
        screen.getByText(/백업할 계정 연결 오류/)
      ).toBeInTheDocument();
    });
  });

  it('2번 모드에서 백업 파일 선택 후 1, 3, 4번 모드로 전환 시 백업 계정이 아닌 실제 계정 로그인을 요구한다', async () => {
    const mockBackupData = {
      version: 1,
      createdAt: '2026-10-20T10:00:00.000Z',
      sourceUser: {
        id: 'backup_user_id',
        display_name: '백업 아카이브 유저',
        email: 'backup@example.com',
        uri: 'spotify:user:backup_user_id',
        images: [],
      },
      playlists: [],
      likedTracks: [],
      savedAlbums: [],
      followedArtists: [],
      savedShows: [],
    };

    window.electronAPI = {
      ...(window.electronAPI || {}),
      openBackupFile: jest.fn().mockResolvedValue({
        success: true,
        canceled: false,
        filePath: 'C:/backups/test_backup.json',
        data: mockBackupData,
      }),
      listAppBackups: jest.fn().mockResolvedValue([]),
      getBackupsDirectory: jest.fn().mockResolvedValue('C:/backups'),
      getStorage: jest.fn().mockResolvedValue({}),
      setStorage: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    render(<App />);
    const idInput = screen.getByPlaceholderText('32자리 Client ID 입력');
    const secretInput = screen.getByPlaceholderText('32자리 Client Secret 입력');
    fireEvent.change(idInput, { target: { value: 'test_client_id_123456789012' } });
    fireEvent.change(secretInput, { target: { value: 'test_client_secret_123456789012' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(screen.getByText('백업 파일 > 계정 전송')).toBeInTheDocument();
    });

    // 2번 모드(백업 파일 > 계정 전송) 선택 및 외부 백업 파일 불러오기
    await act(async () => {
      fireEvent.click(screen.getByText('백업 파일 > 계정 전송'));
    });
    const pickBackupBtn = screen.getByText('외부 백업 파일(JSON) 찾아보기');
    await act(async () => {
      fireEvent.click(pickBackupBtn);
    });

    // 1번 모드(계정 > 계정 전송)로 전환
    await act(async () => {
      fireEvent.click(screen.getByText('계정 > 계정 전송'));
    });

    // 백업 파일의 계정 데이터가 출발 계정으로 채워져 있지 않고 '스포티파이 로그인' 버튼이 노출되어야 함
    expect(screen.queryByText('백업 아카이브 유저')).not.toBeInTheDocument();
    expect(screen.getByText('음악을 가져올 기존 계정에 로그인해 주세요')).toBeInTheDocument();
    expect(screen.getByText('스포티파이 로그인')).toBeInTheDocument();
    expect(screen.queryByText('연결 완료')).not.toBeInTheDocument();

    // 3번 모드(백업 파일 생성)로 전환
    fireEvent.click(screen.getByText('백업 파일(JSON) 생성'));
    expect(screen.queryByText('백업 아카이브 유저')).not.toBeInTheDocument();
    expect(screen.getByText('백업할 계정에 로그인해 주세요')).toBeInTheDocument();
    expect(screen.getByText('스포티파이 로그인')).toBeInTheDocument();

    // 4번 모드(계정 데이터 삭제)로 전환
    fireEvent.click(screen.getByText('계정 데이터 삭제'));
    expect(screen.queryByText('백업 아카이브 유저')).not.toBeInTheDocument();
    expect(screen.getByText('데이터를 정리할 계정에 로그인해 주세요')).toBeInTheDocument();
    expect(screen.getByText('스포티파이 로그인')).toBeInTheDocument();

    // 4번 모드에서 로그인 없이 다음 클릭 시 오류 발생 검증
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => {
      expect(screen.getByText(/정리할 계정 연결 오류: 데이터를 정리할 계정에 로그인해 주세요\./)).toBeInTheDocument();
    });

    // 다시 2번 모드로 돌아왔을 때 백업 파일 데이터가 정상 유지되는지 확인
    fireEvent.click(screen.getByText('백업 파일 > 계정 전송'));
    expect(screen.getByText('백업 파일 보관함')).toBeInTheDocument();
  });

  it('2번 모드에서 백업 파일 선택 후 4단계로 진입하여 중단 발생 시 이전 재개 및 처음부터 다시 진행 드롭다운이 노출된다', async () => {
    const mockBackupData = {
      version: 1,
      createdAt: '2026-10-20T10:00:00.000Z',
      sourceUser: {
        id: 'backup_user_id',
        display_name: '백업 아카이브 유저',
        email: 'backup@example.com',
        uri: 'spotify:user:backup_user_id',
        images: [],
      },
      playlists: [
        {
          id: 'pl-1',
          name: '백업 플레이리스트 1',
          description: '',
          public: true,
          tracks: [],
        },
      ],
      likedTracks: [],
      savedAlbums: [],
      followedArtists: [],
      savedShows: [],
    };

    window.electronAPI = {
      ...(window.electronAPI || {}),
      openBackupFile: jest.fn().mockResolvedValue({
        success: true,
        canceled: false,
        filePath: 'C:/backups/test_backup.json',
        data: mockBackupData,
      }),
      listAppBackups: jest.fn().mockResolvedValue([]),
      getBackupsDirectory: jest.fn().mockResolvedValue('C:/backups'),
      loginSpotify: jest.fn().mockResolvedValue({
        success: true,
        tokenInfo: {
          access_token: 'dst_token_test',
          refresh_token: 'refresh_test',
          expires_in: 3600,
          token_type: 'Bearer',
          expires_at: Date.now() + 3600000,
        },
      }),
      getStorage: jest.fn().mockResolvedValue({}),
      setStorage: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    let releaseFetch: () => void = () => {};
    let shouldHold = false;

    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (shouldHold && url.includes('/playlists')) {
        return new Promise((resolve) => {
          releaseFetch = () => {
            resolve({
              ok: true,
              status: 200,
              text: () =>
                Promise.resolve(
                  JSON.stringify({ id: 'new_pl_id', name: '백업 플레이리스트 1' })
                ),
            });
          };
        });
      }
      if (
        url.includes('/me') &&
        !url.includes('/tracks') &&
        !url.includes('/playlists') &&
        !url.includes('/following') &&
        !url.includes('/albums') &&
        !url.includes('/shows')
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(
            JSON.stringify({
              id: 'dst_user_id',
              display_name: '도착 계정 유저',
              email: 'dst@example.com',
              uri: 'spotify:user:dst_user_id',
              images: [],
            })
          ),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify({ total: 0, items: [] })),
      });
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    render(<App />);
    const idInput = screen.getByPlaceholderText('32자리 Client ID 입력');
    const secretInput = screen.getByPlaceholderText('32자리 Client Secret 입력');
    fireEvent.change(idInput, { target: { value: 'test_client_id_123456789012' } });
    fireEvent.change(secretInput, { target: { value: 'test_client_secret_123456789012' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(screen.getByText('백업 파일 > 계정 전송')).toBeInTheDocument();
    });

    // 2번 모드 선택 및 백업 파일 로드
    await act(async () => {
      fireEvent.click(screen.getByText('백업 파일 > 계정 전송'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('외부 백업 파일(JSON) 찾아보기'));
    });

    // 도착 계정 로그인 진행
    const loginDstBtn = screen.getByText('새 계정 로그인');
    await act(async () => {
      fireEvent.click(loginDstBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText('도착 계정 유저').length).toBeGreaterThan(0);
    });

    // 3단계(음악 및 플레이리스트 선택)로 이동
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '다음' }));
    });

    await waitFor(() => {
      expect(screen.getByText('백업 플레이리스트 1')).toBeInTheDocument();
    });

    // 4단계(데이터 이전 시작)로 이동
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '다음' }));
    });

    await waitFor(() => {
      expect(screen.getByText('데이터 복원 시작')).toBeInTheDocument();
    });

    // 마이그레이션 시작 클릭 후 중단 버튼 노출 및 클릭 검증
    shouldHold = true;
    fireEvent.click(screen.getByText('데이터 복원 시작'));

    await waitFor(() => {
      expect(screen.getByText('중단')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('중단'));
      releaseFetch();
    });

    // 중단 완료 후 "이전 재개" 버튼 및 추가 옵션 드롭다운 버튼 노출 확인
    await waitFor(() => {
      expect(screen.getByText('이전 재개')).toBeInTheDocument();
    });

    const dropdownTrigger = screen.getByLabelText('추가 실행 옵션 열기');
    expect(dropdownTrigger).toBeInTheDocument();

    // 드롭다운 열기
    await act(async () => {
      fireEvent.click(dropdownTrigger);
    });

    expect(screen.getByText('처음부터 다시 진행')).toBeInTheDocument();
    expect(screen.getByText('모든 항목을 초기화하고 재시작')).toBeInTheDocument();
  });
});
