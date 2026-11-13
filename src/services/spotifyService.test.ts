import {
  deleteLikedTracksBatch,
  deleteSavedAlbumsBatch,
  deleteSavedShowsBatch,
  unfollowArtistsBatch,
  removeUrisFromLibrary,
  executeMigrationEngine,
} from './spotifyService';

describe('spotifyService 데이터 삭제 및 언팔로우 함수 테스트', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('removeUrisFromLibrary는 DELETE /me/library?uris=... 형태로 요청을 전송한다', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await removeUrisFromLibrary('mock_token', 'track', ['track1', 'track2']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    const calledOptions = mockFetch.mock.calls[0][1];

    expect(calledUrl).toContain('/me/library?uris=');
    expect(calledUrl).toContain(encodeURIComponent('spotify:track:track1,spotify:track:track2'));
    expect(calledOptions.method).toBe('DELETE');
    expect(calledOptions.headers.Authorization).toBe('Bearer mock_token');
  });

  it('deleteLikedTracksBatch는 통합 라이브러리 엔드포인트를 호출한다', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await deleteLikedTracksBatch('mock_token', ['track123']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/me/library?uris=spotify%3Atrack%3Atrack123');
  });

  it('deleteSavedAlbumsBatch는 통합 라이브러리 엔드포인트를 호출한다', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await deleteSavedAlbumsBatch('mock_token', ['album456']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/me/library?uris=spotify%3Aalbum%3Aalbum456');
  });

  it('deleteSavedShowsBatch는 통합 라이브러리 엔드포인트를 호출한다', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await deleteSavedShowsBatch('mock_token', ['show789']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/me/library?uris=spotify%3Ashow%3Ashow789');
  });

  it('unfollowArtistsBatch는 DELETE /me/following?type=artist 요청 시 JSON body를 포함한다', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await unfollowArtistsBatch('mock_token', ['artist999']);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    const calledOptions = mockFetch.mock.calls[0][1];

    expect(calledUrl).toContain('/me/following?type=artist');
    expect(calledOptions.method).toBe('DELETE');
    expect(calledOptions.body).toBe(JSON.stringify({ ids: ['artist999'] }));
  });

  it('fetchLibrarySummary는 5대 카테고리 요약을 정상 수집한다', async () => {
    const { fetchLibrarySummary } = await import('./spotifyService');
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      let body = {};
      if (url.includes('/me/tracks')) body = { total: 15 };
      else if (url.includes('/me/following')) body = { artists: { total: 8 } };
      else if (url.includes('/me/albums')) body = { total: 3 };
      else if (url.includes('/me/shows')) body = { total: 2 };
      else if (url.includes('/me/playlists')) body = { total: 10 };

      return Promise.resolve({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      });
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const summary = await fetchLibrarySummary('mock_token');
    expect(summary).toEqual({
      likedSongsTotal: 15,
      followedArtistsTotal: 8,
      savedAlbumsTotal: 3,
      savedShowsTotal: 2,
      playlistsTotal: 10,
    });
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('executeMigrationEngine 실행 중 shouldCancel이 true이면 작업을 중단하고 완료 처리하지 않는다', async () => {
    let cancelTriggered = false;
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/me/tracks/contains')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify([false])),
        });
      }
      if (url.includes('/me/library')) {
        cancelTriggered = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(''),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{}'),
      });
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const reports = await executeMigrationEngine({
      srcToken: 'src_token',
      dstToken: 'dst_token',
      dstUserId: 'dst_user',
      config: {
        includeLikedSongs: true,
        includeFollowedArtists: false,
        includeSavedAlbums: false,
        includeSavedShows: false,
        skipDuplicateLibraryItems: false,
        playlistDuplicateMode: 'create_new',
        preserveLikedOrder: false,
        wipeDestinationBeforeMigration: false,
      },
      selectedPlaylists: [],
      selectedLikedTracks: [
        {
          id: 't1',
          name: 'Track 1',
          artists: ['Artist 1'],
          albumName: 'Album 1',
          durationMs: 1000,
          addedAt: '',
          uri: 'spotify:track:t1',
          selected: true,
        },
      ],
      selectedSavedAlbums: [],
      selectedFollowedArtists: [],
      selectedSavedShows: [],
      backupSource: null,
      shouldCancel: () => cancelTriggered,
      onProgress: jest.fn(),
      onLog: jest.fn(),
      onTaskUpdate: jest.fn(),
    });

    expect(reports.length).toBeGreaterThan(0);
    const likedReport = reports.find((r) => r.category === 'liked_songs');
    expect(likedReport).toBeDefined();
    // 중단되었으므로 success가 아니어야 함
    expect(likedReport?.status).not.toBe('success');
  });
});
