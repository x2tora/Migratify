import {
  AccountCleanupCategory,
  AccountCleanupReport,
  LibrarySummaryCounts,
  MigrationConfig,
  MigrationLogEntry,
  MigrationTaskReport,
  SpotifyAlbumItem,
  SpotifyArtistItem,
  SpotifyBackupArchive,
  SpotifyPlaylistSummary,
  SpotifyShowItem,
  SpotifyTrackItem,
  SpotifyUserProfile,
} from '../types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
// Spotify 2026 통합 라이브러리 API(/me/library)의 1회 최대 허용 URI 개수 (40개 제한)
const LIBRARY_URI_BATCH_LIMIT = 40;

// 지정된 밀리초만큼 비동기 대기하는 헬퍼 함수
function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Spotify Web API 공통 호출 함수 (HTTP 429 Rate Limit 자동 재시도 포함)
export async function fetchSpotifyApi<T>(
  endpointOrUrl: string,
  accessToken: string,
  options: RequestInit = {},
  maxRetries = 4
): Promise<T> {
  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `${SPOTIFY_API_BASE}${endpointOrUrl.startsWith('/') ? '' : '/'}${endpointOrUrl}`;

  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      // Rate Limit (HTTP 429) 발생 시 지터(Jitter) 백오프를 적용한 자동 재시도
      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        const parsedSec = retryHeader ? Number(retryHeader) : NaN;
        const retryAfterSec = !isNaN(parsedSec) && parsedSec > 0 ? parsedSec : 2;

        // 일시적 스로틀링(최대 30초 이하)일 때 충돌 방지 지터를 적용하여 재시도
        if (retryAfterSec <= 30 && attempt < maxRetries) {
          const jitterMs = Math.floor(Math.random() * 800) + 400;
          const waitMs = retryAfterSec * 1000 + jitterMs;
          await delayMs(waitMs);
          attempt += 1;
          continue;
        }

        let reasonDetail = '';
        try {
          const errJson = await response.json();
          if (errJson?.error?.reason) reasonDetail = ` (${errJson.error.reason})`;
        } catch {}

        const minutes = Math.ceil(retryAfterSec / 60);
        throw new Error(
          `Spotify API 사용량 한도 초과(HTTP 429 Quota Exceeded${reasonDetail}). Spotify 정책상 약 ${minutes}분간 호출이 제한됩니다. Spotify Dashboard에서 새 앱을 생성하여 새 Client ID/Secret을 1단계에 입력하시면 대기 없이 즉시 이용할 수 있습니다.`
        );
      }

      // 서버 일시 오류 (5xx) 시 지수 백오프 재시도
      if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
        await delayMs(Math.pow(2, attempt) * 600);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errorDetail = `HTTP ${response.status}: ${errJson.error.message}`;
          }
        } catch {
          const text = await response.text().catch(() => '');
          if (text) {
            errorDetail = `HTTP ${response.status}: ${text}`;
          }
        }
        throw new Error(errorDetail);
      }

      // 204 No Content 또는 빈 본문 처리
      const textBody = await response.text();
      if (!textBody) {
        return {} as T;
      }
      return JSON.parse(textBody) as T;
    } catch (error) {
      if (
        attempt >= maxRetries ||
        (error instanceof Error &&
          (error.message.startsWith('HTTP 4') ||
            error.message.includes('HTTP 429') ||
            error.message.includes('429 Quota Exceeded')))
      ) {
        throw error;
      }
      attempt += 1;
      await delayMs(800 * attempt);
    }
  }
}

// 현재 로그인된 사용자 프로필 조회 함수
export async function fetchUserProfile(
  accessToken: string
): Promise<SpotifyUserProfile> {
  try {
    return await fetchSpotifyApi<SpotifyUserProfile>('/me', accessToken);
  } catch (error) {
    throw error;
  }
}

// 계정의 보관함 요약 개수(좋아요 곡, 팔로우 아티스트, 저장 앨범, 팟캐스트, 플레이리스트) 조회 함수
export async function fetchLibrarySummary(
  accessToken: string
): Promise<LibrarySummaryCounts> {
  try {
    // 5대 카테고리를 동시 다발적(Promise.all)으로 전송하면 순간 버스트로 인해 HTTP 429가 발생하므로 미세 지연을 두고 순차 실행
    const tracksRes = await fetchSpotifyApi<{ total: number }>(
      '/me/tracks?limit=1',
      accessToken
    ).catch(() => ({ total: 0 }));
    await delayMs(60);

    const artistsRes = await fetchSpotifyApi<{ artists: { total: number } }>(
      '/me/following?type=artist&limit=1',
      accessToken
    ).catch(() => ({ artists: { total: 0 } }));
    await delayMs(60);

    const albumsRes = await fetchSpotifyApi<{ total: number }>(
      '/me/albums?limit=1',
      accessToken
    ).catch(() => ({ total: 0 }));
    await delayMs(60);

    const showsRes = await fetchSpotifyApi<{ total: number }>(
      '/me/shows?limit=1',
      accessToken
    ).catch(() => ({ total: 0 }));
    await delayMs(60);

    const playlistsRes = await fetchSpotifyApi<{ total: number }>(
      '/me/playlists?limit=1',
      accessToken
    ).catch(() => ({ total: 0 }));

    return {
      likedSongsTotal: tracksRes?.total ?? 0,
      followedArtistsTotal: artistsRes?.artists?.total ?? 0,
      savedAlbumsTotal: albumsRes?.total ?? 0,
      savedShowsTotal: showsRes?.total ?? 0,
      playlistsTotal: playlistsRes?.total ?? 0,
    };
  } catch (error) {
    throw error;
  }
}

// 사용자의 전체 플레이리스트 목록 조회 함수 (tracks.total 0 보정 및 커버 이미지 정확 조회)
export async function fetchUserPlaylists(
  accessToken: string
): Promise<SpotifyPlaylistSummary[]> {
  try {
    const playlists: SpotifyPlaylistSummary[] = [];
    let nextUrl: string | null = '/me/playlists?limit=50';

    while (nextUrl) {
      const page: {
        items: Array<{
          id: string;
          name: string;
          description?: string;
          owner?: { id?: string; display_name?: string };
          public?: boolean;
          collaborative?: boolean;
          items?: { total?: number };
          tracks?: { total?: number; href?: string };
          images?: Array<{ url: string }>;
          total_tracks?: number;
          total?: number;
        } | null>;
        next: string | null;
      } = await fetchSpotifyApi(nextUrl, accessToken);

      for (const item of page.items || []) {
        if (!item || !item.id) continue;
        const cleanDesc = item.description
          ? item.description.replace(/<[^>]*>/g, '')
          : '';

        // 다양한 Spotify API 스키마 변형 대응
        const count =
          item.tracks?.total ??
          item.items?.total ??
          item.total_tracks ??
          (item as any).tracks_total ??
          (item as any).total ??
          0;

        const coverUrl =
          item.images?.[0]?.url ||
          item.images?.[1]?.url ||
          (item as any).image_url;

        playlists.push({
          id: item.id,
          name: item.name || '이름 없는 플레이리스트',
          description: cleanDesc,
          ownerId: item.owner?.id || '',
          ownerName: item.owner?.display_name || item.owner?.id || 'Spotify User',
          public: Boolean(item.public),
          collaborative: Boolean(item.collaborative),
          tracksTotal: count,
          imageUrl: coverUrl,
          selected: true,
          customName: item.name || '이름 없는 플레이리스트',
          customDescription:
            cleanDesc || 'Migrated via Migratify',
          customPublic: Boolean(item.public),
        });
      }
      nextUrl = page.next;
      if (nextUrl) await delayMs(80);
    }

    return playlists;
  } catch (error) {
    throw error;
  }
}

// 특정 플레이리스트의 전체 트랙 목록 조회 함수 (표준 /playlists/{id}/tracks 및 /playlists/{id}/items 호환)
export async function fetchPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<SpotifyTrackItem[]> {
  try {
    const tracks: SpotifyTrackItem[] = [];
    let nextUrl: string | null = `/playlists/${playlistId}/tracks?limit=50&additional_types=track`;
    let usedFallback = false;

    while (nextUrl) {
      let page: {
        items: Array<{
          added_at?: string;
          is_local?: boolean;
          item?: {
            id?: string | null;
            uri?: string;
            name?: string;
            duration_ms?: number;
            is_local?: boolean;
            artists?: Array<{ name: string }>;
            album?: {
              name?: string;
              images?: Array<{ url: string }>;
            };
          } | null;
          track?: {
            id?: string | null;
            uri?: string;
            name?: string;
            duration_ms?: number;
            is_local?: boolean;
            artists?: Array<{ name: string }>;
            album?: {
              name?: string;
              images?: Array<{ url: string }>;
            };
          } | null;
        } | null>;
        next: string | null;
      };

      try {
        page = await fetchSpotifyApi(nextUrl, accessToken);
      } catch (err) {
        if (!usedFallback && nextUrl.includes('/tracks')) {
          usedFallback = true;
          nextUrl = `/playlists/${playlistId}/items?limit=50&additional_types=track`;
          page = await fetchSpotifyApi(nextUrl, accessToken);
        } else {
          throw err;
        }
      }

      for (const entry of page.items || []) {
        const t = entry?.item || entry?.track;
        if (!t) continue;
        const isLocal = Boolean(
          entry?.is_local || t.is_local || !t.id || t.uri?.includes(':local:')
        );
        tracks.push({
          id: t.id || `local-${tracks.length}`,
          uri: t.uri || (t.id ? `spotify:track:${t.id}` : ''),
          name: t.name || '알 수 없는 트랙',
          artists: (t.artists || []).map((a) => a.name),
          albumName: t.album?.name || '',
          albumImageUrl: t.album?.images?.[0]?.url,
          durationMs: t.duration_ms || 0,
          addedAt: entry?.added_at,
          isLocal,
          selected: !isLocal,
        });
      }
      nextUrl = page.next;
    }

    return tracks;
  } catch (error) {
    throw error;
  }
}

// 좋아요 표시한 곡 전체 조회 함수 (진행률 콜백 지원)
export async function fetchAllLikedTracks(
  accessToken: string,
  onProgressCount?: (loaded: number, total: number) => void
): Promise<SpotifyTrackItem[]> {
  try {
    const tracks: SpotifyTrackItem[] = [];
    let nextUrl: string | null = '/me/tracks?limit=50';

    while (nextUrl) {
      const page: {
        total?: number;
        items: Array<{
          added_at?: string;
          track?: {
            id?: string;
            uri?: string;
            name?: string;
            duration_ms?: number;
            artists?: Array<{ name: string }>;
            album?: {
              name?: string;
              images?: Array<{ url: string }>;
            };
          } | null;
        }>;
        next: string | null;
      } = await fetchSpotifyApi(nextUrl, accessToken);

      for (const item of page.items || []) {
        const t = item?.track;
        if (!t || !t.id) continue;
        tracks.push({
          id: t.id,
          uri: t.uri || `spotify:track:${t.id}`,
          name: t.name || '알 수 없는 트랙',
          artists: (t.artists || []).map((a) => a.name),
          albumName: t.album?.name || '',
          albumImageUrl: t.album?.images?.[0]?.url,
          durationMs: t.duration_ms || 0,
          addedAt: item.added_at,
          isLocal: false,
          selected: true,
        });
      }
      if (onProgressCount) {
        onProgressCount(tracks.length, page.total ?? tracks.length);
      }
      nextUrl = page.next;
      if (nextUrl) await delayMs(80);
    }

    return tracks;
  } catch (error) {
    throw error;
  }
}

// 저장한 앨범 전체 조회 함수
export async function fetchAllSavedAlbums(
  accessToken: string
): Promise<SpotifyAlbumItem[]> {
  try {
    const albums: SpotifyAlbumItem[] = [];
    let nextUrl: string | null = '/me/albums?limit=50';

    while (nextUrl) {
      const page: {
        items: Array<{
          added_at?: string;
          album?: {
            id?: string;
            uri?: string;
            name?: string;
            release_date?: string;
            total_tracks?: number;
            artists?: Array<{ name: string }>;
            images?: Array<{ url: string }>;
          } | null;
        }>;
        next: string | null;
      } = await fetchSpotifyApi(nextUrl, accessToken);

      for (const item of page.items || []) {
        const a = item?.album;
        if (!a || !a.id) continue;
        albums.push({
          id: a.id,
          uri: a.uri || `spotify:album:${a.id}`,
          name: a.name || '알 수 없는 앨범',
          artists: (a.artists || []).map((ar) => ar.name),
          imageUrl: a.images?.[0]?.url,
          releaseDate: a.release_date,
          totalTracks: a.total_tracks || 0,
          addedAt: item.added_at,
          selected: true,
        });
      }
      nextUrl = page.next;
      if (nextUrl) await delayMs(80);
    }

    return albums;
  } catch (error) {
    throw error;
  }
}

// 팔로우한 아티스트 전체 조회 함수
export async function fetchAllFollowedArtists(
  accessToken: string
): Promise<SpotifyArtistItem[]> {
  try {
    const artists: SpotifyArtistItem[] = [];
    let nextUrl: string | null = '/me/following?type=artist&limit=50';

    while (nextUrl) {
      const page: {
        artists?: {
          items: Array<{
            id?: string;
            uri?: string;
            name?: string;
            genres?: string[];
            images?: Array<{ url: string }>;
            followers?: { total?: number };
          }>;
          next: string | null;
        };
      } = await fetchSpotifyApi(nextUrl, accessToken);

      const items = page.artists?.items || [];
      for (const ar of items) {
        if (!ar || !ar.id) continue;
        artists.push({
          id: ar.id,
          uri: ar.uri || `spotify:artist:${ar.id}`,
          name: ar.name || '알 수 없는 아티스트',
          genres: ar.genres || [],
          imageUrl: ar.images?.[0]?.url,
          followersTotal: ar.followers?.total,
          selected: true,
        });
      }
      nextUrl = page.artists?.next || null;
      if (nextUrl) await delayMs(80);
    }

    return artists;
  } catch (error) {
    throw error;
  }
}

// 팔로우한 팟캐스트(쇼/프로그램) 전체 조회 함수
export async function fetchAllSavedShows(
  accessToken: string
): Promise<SpotifyShowItem[]> {
  try {
    const shows: SpotifyShowItem[] = [];
    let nextUrl: string | null = '/me/shows?limit=50';

    while (nextUrl) {
      const page: {
        items: Array<{
          added_at?: string;
          show?: {
            id?: string;
            uri?: string;
            name?: string;
            publisher?: string;
            description?: string;
            total_episodes?: number;
            images?: Array<{ url: string }>;
          } | null;
        }>;
        next: string | null;
      } = await fetchSpotifyApi(nextUrl, accessToken);

      for (const item of page.items || []) {
        const s = item?.show || (item as any);
        if (!s || !s.id) continue;
        const img =
          s.images?.[0]?.url ||
          s.images?.[1]?.url ||
          (item as any)?.images?.[0]?.url ||
          (s as any)?.image_url;

        shows.push({
          id: s.id,
          uri: s.uri || `spotify:show:${s.id}`,
          name: s.name || '알 수 없는 팟캐스트',
          publisher: s.publisher || '알 수 없는 제작사',
          description: s.description
            ? s.description.replace(/<[^>]*>/g, '')
            : '',
          imageUrl: img,
          totalEpisodes: s.total_episodes ?? (s as any).totalEpisodes ?? 0,
          addedAt: item.added_at,
          selected: true,
        });
      }
      nextUrl = page.next;
      if (nextUrl) await delayMs(80);
    }

    return shows;
  } catch {
    return [];
  }
}

// 전체 계정 데이터를 JSON 백업 아카이브 객체로 생성하는 함수
export async function buildFullBackupArchive(
  accessToken: string,
  userProfile: SpotifyUserProfile,
  playlists: SpotifyPlaylistSummary[],
  onProgress?: (msg: string) => void
): Promise<SpotifyBackupArchive> {
  try {
    onProgress?.('좋아요 표시한 곡 수집 중...');
    const likedTracks = await fetchAllLikedTracks(accessToken);

    onProgress?.('저장한 앨범 수집 중...');
    const savedAlbums = await fetchAllSavedAlbums(accessToken);

    onProgress?.('팔로우한 아티스트 수집 중...');
    const followedArtists = await fetchAllFollowedArtists(accessToken);

    onProgress?.('팔로우한 팟캐스트 수집 중...');
    const savedShows = await fetchAllSavedShows(accessToken).catch(() => []);

    const exportedPlaylists: SpotifyBackupArchive['playlists'] = [];
    const selectedOrAll = playlists.some((p) => p.selected)
      ? playlists.filter((p) => p.selected)
      : playlists;

    for (let i = 0; i < selectedOrAll.length; i++) {
      const pl = selectedOrAll[i];
      onProgress?.(
        `플레이리스트 수록곡 수집 중 (${i + 1}/${selectedOrAll.length}): ${pl.name}`
      );
      try {
        const tracks =
          pl.cachedTracks || (await fetchPlaylistTracks(accessToken, pl.id));
        exportedPlaylists.push({
          id: pl.id,
          name: pl.customName || pl.name,
          description: pl.customDescription || pl.description,
          public: pl.customPublic,
          tracks: tracks.filter((t) => t.selected !== false),
        });
      } catch {
        // 외부 큐레이터 소유 플레이리스트 등 트랙 조회가 제한된 경우 빈 트랙 목록으로 메타데이터만 보존
        exportedPlaylists.push({
          id: pl.id,
          name: pl.customName || pl.name,
          description: pl.customDescription || pl.description,
          public: pl.customPublic,
          tracks: [],
        });
      }
    }

    return {
      schemaVersion: '3.2.0',
      exportedAt: new Date().toISOString(),
      sourceUser: userProfile,
      likedTracks,
      savedAlbums,
      followedArtists,
      savedShows,
      playlists: exportedPlaylists,
    };
  } catch (error) {
    throw error;
  }
}

// 백업 아카이브 데이터를 엑셀 호환 CSV 문자열로 변환하는 함수
export function convertBackupArchiveToCsv(
  archive: SpotifyBackupArchive
): string {
  try {
    const escapeCsv = (val: string | number | undefined): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [
      [
        '구분(Category)',
        '플레이리스트/분류명',
        '제목(Name)',
        '아티스트/제작사(Artists)',
        '앨범/부가정보(Album)',
        'Spotify ID',
      ].join(','),
    ];

    for (const t of archive.likedTracks) {
      rows.push(
        [
          escapeCsv('좋아요한 곡'),
          escapeCsv('Liked Songs'),
          escapeCsv(t.name),
          escapeCsv(t.artists.join('; ')),
          escapeCsv(t.albumName),
          escapeCsv(t.id),
        ].join(',')
      );
    }

    for (const al of archive.savedAlbums) {
      rows.push(
        [
          escapeCsv('저장한 앨범'),
          escapeCsv('Saved Albums'),
          escapeCsv(al.name),
          escapeCsv(al.artists.join('; ')),
          escapeCsv(al.releaseDate || ''),
          escapeCsv(al.id),
        ].join(',')
      );
    }

    for (const ar of archive.followedArtists) {
      rows.push(
        [
          escapeCsv('팔로우 아티스트'),
          escapeCsv('Followed Artists'),
          escapeCsv(ar.name),
          escapeCsv(ar.genres.join('; ')),
          escapeCsv(''),
          escapeCsv(ar.id),
        ].join(',')
      );
    }

    for (const sh of archive.savedShows || []) {
      rows.push(
        [
          escapeCsv('팟캐스트'),
          escapeCsv('Saved Shows'),
          escapeCsv(sh.name),
          escapeCsv(sh.publisher),
          escapeCsv(`${sh.totalEpisodes}화`),
          escapeCsv(sh.id),
        ].join(',')
      );
    }

    for (const pl of archive.playlists) {
      for (const t of pl.tracks) {
        rows.push(
          [
            escapeCsv('플레이리스트'),
            escapeCsv(pl.name),
            escapeCsv(t.name),
            escapeCsv(t.artists.join('; ')),
            escapeCsv(t.albumName),
            escapeCsv(t.id),
          ].join(',')
        );
      }
    }

    return rows.join('\n');
  } catch (error) {
    throw error;
  }
}

// Spotify 2026 통합 라이브러리(/me/library/contains)를 사용해 새 계정에 이미 있는 항목을 제외하는 함수 (최대 40개 배치)
async function filterNonDuplicateIds(
  dstToken: string,
  uriPrefix: 'track' | 'album' | 'artist' | 'playlist' | 'show',
  ids: string[]
): Promise<{ toAdd: string[]; skippedCount: number }> {
  try {
    const toAdd: string[] = [];
    let skippedCount = 0;

    for (let i = 0; i < ids.length; i += LIBRARY_URI_BATCH_LIMIT) {
      const chunk = ids.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
      const urisParam = chunk.map((id) => `spotify:${uriPrefix}:${id}`).join(',');
      const endpoint = `/me/library/contains?uris=${encodeURIComponent(urisParam)}`;

      const existsFlags = await fetchSpotifyApi<boolean[]>(endpoint, dstToken);
      chunk.forEach((id, idx) => {
        if (existsFlags?.[idx]) {
          skippedCount += 1;
        } else {
          toAdd.push(id);
        }
      });
    }

    return { toAdd, skippedCount };
  } catch {
    return { toAdd: ids, skippedCount: 0 };
  }
}

// Spotify 2026 통합 라이브러리(/me/library)에 최대 40개 단위로 URI를 저장/팔로우하는 함수
async function saveUrisToLibrary(
  dstToken: string,
  uriPrefix: 'track' | 'album' | 'artist' | 'playlist' | 'show',
  ids: string[]
): Promise<void> {
  const urisParam = ids.map((id) => `spotify:${uriPrefix}:${id}`).join(',');
  await fetchSpotifyApi(
    `/me/library?uris=${encodeURIComponent(urisParam)}`,
    dstToken,
    {
      method: 'PUT',
    }
  );
}

// Spotify 2026 통합 라이브러리(/me/library)에서 최대 40개 단위로 URI를 삭제/언팔로우하는 함수
export async function removeUrisFromLibrary(
  token: string,
  uriPrefix: 'track' | 'album' | 'artist' | 'playlist' | 'show',
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const urisParam = ids.map((id) => `spotify:${uriPrefix}:${id}`).join(',');
  await fetchSpotifyApi(
    `/me/library?uris=${encodeURIComponent(urisParam)}`,
    token,
    {
      method: 'DELETE',
    }
  );
}


// 마이그레이션 실행 엔진 파라미터 인터페이스
export interface ExecuteMigrationParams {
  srcToken: string | null;
  srcUserId?: string;
  dstToken: string;
  dstUserId: string;
  config: MigrationConfig;
  selectedPlaylists: SpotifyPlaylistSummary[];
  selectedLikedTracks?: SpotifyTrackItem[] | null;
  selectedSavedAlbums?: SpotifyAlbumItem[] | null;
  selectedFollowedArtists?: SpotifyArtistItem[] | null;
  selectedSavedShows?: SpotifyShowItem[] | null;
  backupSource: SpotifyBackupArchive | null;
  onlyTaskIds?: string[];
  shouldCancel: () => boolean;
  onProgress: (percent: number, statusText: string) => void;
  onLog: (level: MigrationLogEntry['level'], message: string) => void;
  onTaskUpdate: (reports: MigrationTaskReport[]) => void;
}

// 전체 마이그레이션 파이프라인을 실행하고 작업별 상세 리포트를 반환하는 함수
export async function executeMigrationEngine(
  params: ExecuteMigrationParams
): Promise<MigrationTaskReport[]> {
  const {
    srcToken,
    srcUserId,
    dstToken,
    config,
    selectedPlaylists,
    selectedLikedTracks,
    selectedSavedAlbums,
    selectedFollowedArtists,
    selectedSavedShows,
    backupSource,
    onlyTaskIds,
    shouldCancel,
    onProgress,
    onLog,
    onTaskUpdate,
  } = params;

  const reports: MigrationTaskReport[] = [];
  const updateReports = (): void => {
    onTaskUpdate([...reports]);
  };

  try {
    onProgress(2, '마이그레이션 작업 계획을 구성하고 있습니다...');
    onLog('info', '[초기화] 선택한 항목과 대상 계정의 상태를 점검합니다.');

    // 작업 대기열 구성
    if (
      config.includeLikedSongs &&
      (!onlyTaskIds || onlyTaskIds.includes('task-liked-songs'))
    ) {
      reports.push({
        id: 'task-liked-songs',
        category: 'liked_songs',
        title: '좋아요 표시한 곡',
        totalCount: selectedLikedTracks ? selectedLikedTracks.length : 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        status: 'pending',
      });
    }

    if (
      config.includeFollowedArtists &&
      (!onlyTaskIds || onlyTaskIds.includes('task-followed-artists'))
    ) {
      reports.push({
        id: 'task-followed-artists',
        category: 'followed_artists',
        title: '팔로우한 아티스트',
        totalCount: selectedFollowedArtists ? selectedFollowedArtists.length : 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        status: 'pending',
      });
    }

    if (
      config.includeSavedAlbums &&
      (!onlyTaskIds || onlyTaskIds.includes('task-saved-albums'))
    ) {
      reports.push({
        id: 'task-saved-albums',
        category: 'saved_albums',
        title: '저장한 앨범',
        totalCount: selectedSavedAlbums ? selectedSavedAlbums.length : 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        status: 'pending',
      });
    }

    if (
      config.includeSavedShows &&
      (!onlyTaskIds || onlyTaskIds.includes('task-saved-shows'))
    ) {
      reports.push({
        id: 'task-saved-shows',
        category: 'saved_shows',
        title: '팔로우한 팟캐스트',
        totalCount: selectedSavedShows ? selectedSavedShows.length : 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        status: 'pending',
      });
    }

    for (const pl of selectedPlaylists) {
      const taskId = `task-pl-${pl.id}`;
      if (onlyTaskIds && !onlyTaskIds.includes(taskId)) continue;
      reports.push({
        id: taskId,
        category: 'playlist',
        title: pl.customName || pl.name,
        totalCount: pl.cachedTracks
          ? pl.cachedTracks.filter((t) => t.selected !== false).length
          : pl.tracksTotal,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        status: 'pending',
        playlistId: pl.id,
      });
    }

    updateReports();

    if (reports.length === 0) {
      onProgress(100, '실행할 마이그레이션 작업이 없습니다.');
      return reports;
    }

    // 도착 계정 기존 데이터 초기화(삭제) 사전 실행
    if (config.wipeDestinationBeforeMigration) {
      if (shouldCancel()) {
        onLog('warn', '사용자 요청에 의해 마이그레이션이 중단되었습니다.');
        return reports;
      }

      onProgress(1, '전송 전 도착 계정의 기존 데이터를 삭제하는 중입니다...');
      onLog('warn', '[초기화] 설정에 따라 도착 계정의 기존 데이터 삭제를 시작합니다.');

      const cleanupCategories: AccountCleanupCategory[] = [];
      if (reports.some((r) => r.category === 'playlist')) {
        cleanupCategories.push('playlists');
      }
      if (reports.some((r) => r.category === 'liked_songs')) {
        cleanupCategories.push('liked_songs');
      }
      if (reports.some((r) => r.category === 'saved_albums')) {
        cleanupCategories.push('saved_albums');
      }
      if (reports.some((r) => r.category === 'followed_artists')) {
        cleanupCategories.push('followed_artists');
      }
      if (reports.some((r) => r.category === 'saved_shows')) {
        cleanupCategories.push('saved_shows');
      }

      if (cleanupCategories.length > 0) {
        await executeAccountCleanup({
          token: dstToken,
          categories: cleanupCategories,
          shouldCancel,
          onProgress: (p, text) => {
            onProgress(Math.min(10, Math.round(p * 0.1)), `[도착 계정 삭제] ${text}`);
          },
          onLog: (lvl, msg) => {
            onLog(lvl, `[도착 계정 삭제] ${msg}`);
          },
        });
        onLog('success', '[초기화] 도착 계정 데이터 삭제 완료. 새 데이터 전송을 시작합니다.');
      }
    }

    // 새 계정의 기존 플레이리스트 목록 사전 조회 (병합/중복 건너뛰기용)
    let dstExistingPlaylists: SpotifyPlaylistSummary[] = [];
    if (
      reports.some((r) => r.category === 'playlist') &&
      config.playlistDuplicateMode !== 'create_new'
    ) {
      try {
        onLog('info', '새 계정의 기존 플레이리스트 목록을 확인합니다...');
        dstExistingPlaylists = await fetchUserPlaylists(dstToken);
      } catch {
        dstExistingPlaylists = [];
      }
    }

    const totalTasks = reports.length;

    for (let idx = 0; idx < reports.length; idx++) {
      if (shouldCancel()) {
        onLog('warn', '사용자 요청에 의해 마이그레이션이 중단되었습니다.');
        for (let rem = idx; rem < reports.length; rem++) {
          if (reports[rem].status === 'running') {
            reports[rem].status = 'pending';
          }
        }
        updateReports();
        break;
      }

      const task = reports[idx];
      task.status = 'running';
      updateReports();

      const basePercent = Math.round((idx / totalTasks) * 100);
      const taskWeight = 100 / totalTasks;

      // 1. 좋아요 표시한 곡 이전 (PUT /me/library, 40개 단위 배치)
      if (task.category === 'liked_songs') {
        try {
          onProgress(basePercent, '좋아요 표시한 곡 목록을 확인하는 중...');
          const tracks = selectedLikedTracks
            ? selectedLikedTracks
            : backupSource
            ? backupSource.likedTracks.filter((t) => t.selected !== false)
            : srcToken
            ? await fetchAllLikedTracks(srcToken)
            : [];

          let trackIds = tracks
            .filter(
              (t) =>
                t.selected !== false &&
                !t.isLocal &&
                t.id &&
                !t.id.startsWith('local-')
            )
            .map((t) => t.id);

          if (config.preserveLikedOrder) {
            trackIds = [...trackIds].reverse();
          }

          task.totalCount = trackIds.length;
          updateReports();

          if (trackIds.length === 0) {
            task.status = 'success';
            onLog('info', '-> 선택된 좋아요 곡이 0개이므로 건너뜁니다.');
            updateReports();
            continue;
          }

          let targetIds = trackIds;
          if (config.skipDuplicateLibraryItems) {
            onProgress(basePercent + 2, '좋아요 표시한 곡 중복 여부 검사 중...');
            const filtered = await filterNonDuplicateIds(dstToken, 'track', trackIds);
            targetIds = filtered.toAdd;
            task.skippedCount = filtered.skippedCount;
          }

          onLog(
            'info',
            `-> 좋아요 표시한 곡 선택 ${task.totalCount}곡 중 ${targetIds.length}곡 이전 시작 (중복 제외: ${task.skippedCount}곡)`
          );

          for (let i = 0; i < targetIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
            if (shouldCancel()) break;
            const batch = targetIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
            await saveUrisToLibrary(dstToken, 'track', batch);
            task.migratedCount += batch.length;
            updateReports();
            const subProgress = Math.round(
              basePercent +
                ((i + batch.length) / Math.max(1, targetIds.length)) * taskWeight
            );
            onProgress(
              Math.min(99, subProgress),
              `좋아요 표시한 곡 이전 중... (${task.migratedCount}/${targetIds.length})`
            );
            await delayMs(90);
          }

          if (shouldCancel()) {
            task.status = task.migratedCount > 0 ? 'partial' : 'pending';
            task.errorMessage = '사용자에 의해 작업이 중단되었습니다.';
            updateReports();
            break;
          }

          task.status = 'success';
          onLog(
            'success',
            `[완료] 좋아요 표시한 곡: ${task.migratedCount}곡 추가됨 (${task.skippedCount}곡 중복 건너뜀)`
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          task.status = task.migratedCount > 0 ? 'partial' : 'failed';
          task.failedCount = Math.max(
            1,
            task.totalCount - task.migratedCount - task.skippedCount
          );
          task.errorMessage = msg;
          onLog('error', `[오류] 좋아요 표시한 곡 이전 실패: ${msg}`);
        }
        updateReports();
      }

      // 2. 팔로우한 아티스트 이전 (PUT /me/library, 40개 단위 배치)
      else if (task.category === 'followed_artists') {
        try {
          onProgress(basePercent, '팔로우한 아티스트 목록을 확인하는 중...');
          const artists = selectedFollowedArtists
            ? selectedFollowedArtists
            : backupSource
            ? backupSource.followedArtists.filter((a) => a.selected !== false)
            : srcToken
            ? await fetchAllFollowedArtists(srcToken)
            : [];
          const artistIds = artists
            .filter((a) => a.selected !== false && a.id)
            .map((a) => a.id);

          task.totalCount = artistIds.length;
          updateReports();

          if (artistIds.length === 0) {
            task.status = 'success';
            onLog('info', '-> 선택된 팔로우 아티스트가 0명이므로 건너뜁니다.');
            updateReports();
            continue;
          }

          let targetIds = artistIds;
          if (config.skipDuplicateLibraryItems) {
            onProgress(basePercent + 2, '팔로우한 아티스트 중복 여부 검사 중...');
            const filtered = await filterNonDuplicateIds(dstToken, 'artist', artistIds);
            targetIds = filtered.toAdd;
            task.skippedCount = filtered.skippedCount;
          }

          onLog(
            'info',
            `-> 팔로우 아티스트 선택 ${task.totalCount}명 중 ${targetIds.length}명 팔로우 시작 (중복 제외: ${task.skippedCount}명)`
          );

          for (let i = 0; i < targetIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
            if (shouldCancel()) break;
            const batch = targetIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
            await saveUrisToLibrary(dstToken, 'artist', batch);
            task.migratedCount += batch.length;
            updateReports();
            const subProgress = Math.round(
              basePercent +
                ((i + batch.length) / Math.max(1, targetIds.length)) * taskWeight
            );
            onProgress(
              Math.min(99, subProgress),
              `팔로우한 아티스트 이전 중... (${task.migratedCount}/${targetIds.length})`
            );
            await delayMs(90);
          }

          if (shouldCancel()) {
            task.status = task.migratedCount > 0 ? 'partial' : 'pending';
            task.errorMessage = '사용자에 의해 작업이 중단되었습니다.';
            updateReports();
            break;
          }

          task.status = 'success';
          onLog(
            'success',
            `[완료] 팔로우한 아티스트: ${task.migratedCount}명 추가됨 (${task.skippedCount}명 중복 건너뜀)`
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          task.status = task.migratedCount > 0 ? 'partial' : 'failed';
          task.failedCount = Math.max(
            1,
            task.totalCount - task.migratedCount - task.skippedCount
          );
          task.errorMessage = msg;
          onLog('error', `[오류] 팔로우한 아티스트 이전 실패: ${msg}`);
        }
        updateReports();
      }

      // 3. 저장한 앨범 이전 (PUT /me/library, 40개 단위 배치)
      else if (task.category === 'saved_albums') {
        try {
          onProgress(basePercent, '저장한 앨범 목록을 확인하는 중...');
          const albums = selectedSavedAlbums
            ? selectedSavedAlbums
            : backupSource
            ? backupSource.savedAlbums.filter((al) => al.selected !== false)
            : srcToken
            ? await fetchAllSavedAlbums(srcToken)
            : [];
          const albumIds = albums
            .filter((al) => al.selected !== false && al.id)
            .map((al) => al.id);

          task.totalCount = albumIds.length;
          updateReports();

          if (albumIds.length === 0) {
            task.status = 'success';
            onLog('info', '-> 선택된 저장 앨범이 0개이므로 건너뜁니다.');
            updateReports();
            continue;
          }

          let targetIds = albumIds;
          if (config.skipDuplicateLibraryItems) {
            onProgress(basePercent + 2, '저장한 앨범 중복 여부 검사 중...');
            const filtered = await filterNonDuplicateIds(dstToken, 'album', albumIds);
            targetIds = filtered.toAdd;
            task.skippedCount = filtered.skippedCount;
          }

          onLog(
            'info',
            `-> 저장한 앨범 선택 ${task.totalCount}개 중 ${targetIds.length}개 이전 시작 (중복 제외: ${task.skippedCount}개)`
          );

          for (let i = 0; i < targetIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
            if (shouldCancel()) break;
            const batch = targetIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
            await saveUrisToLibrary(dstToken, 'album', batch);
            task.migratedCount += batch.length;
            updateReports();
            const subProgress = Math.round(
              basePercent +
                ((i + batch.length) / Math.max(1, targetIds.length)) * taskWeight
            );
            onProgress(
              Math.min(99, subProgress),
              `저장한 앨범 이전 중... (${task.migratedCount}/${targetIds.length})`
            );
            await delayMs(90);
          }

          if (shouldCancel()) {
            task.status = task.migratedCount > 0 ? 'partial' : 'pending';
            task.errorMessage = '사용자에 의해 작업이 중단되었습니다.';
            updateReports();
            break;
          }

          task.status = 'success';
          onLog(
            'success',
            `[완료] 저장한 앨범: ${task.migratedCount}개 추가됨 (${task.skippedCount}개 중복 건너뜀)`
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          task.status = task.migratedCount > 0 ? 'partial' : 'failed';
          task.failedCount = Math.max(
            1,
            task.totalCount - task.migratedCount - task.skippedCount
          );
          task.errorMessage = msg;
          onLog('error', `[오류] 저장한 앨범 이전 실패: ${msg}`);
        }
        updateReports();
      }

      // 4. 팔로우한 팟캐스트(쇼) 이전 (PUT /me/library, 40개 단위 배치)
      else if (task.category === 'saved_shows') {
        try {
          onProgress(basePercent, '팔로우한 팟캐스트 목록을 확인하는 중...');
          const shows = selectedSavedShows
            ? selectedSavedShows
            : backupSource
            ? (backupSource.savedShows || []).filter((s) => s.selected !== false)
            : srcToken
            ? await fetchAllSavedShows(srcToken)
            : [];
          const showIds = shows
            .filter((s) => s.selected !== false && s.id)
            .map((s) => s.id);

          task.totalCount = showIds.length;
          updateReports();

          if (showIds.length === 0) {
            task.status = 'success';
            onLog('info', '-> 선택된 팟캐스트가 0개이므로 건너뜁니다.');
            updateReports();
            continue;
          }

          let targetIds = showIds;
          if (config.skipDuplicateLibraryItems) {
            onProgress(basePercent + 2, '팔로우한 팟캐스트 중복 여부 검사 중...');
            const filtered = await filterNonDuplicateIds(dstToken, 'show', showIds);
            targetIds = filtered.toAdd;
            task.skippedCount = filtered.skippedCount;
          }

          onLog(
            'info',
            `-> 팔로우한 팟캐스트 선택 ${task.totalCount}개 중 ${targetIds.length}개 이전 시작 (중복 제외: ${task.skippedCount}개)`
          );

          for (let i = 0; i < targetIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
            if (shouldCancel()) break;
            const batch = targetIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
            await saveUrisToLibrary(dstToken, 'show', batch);
            task.migratedCount += batch.length;
            updateReports();
            const subProgress = Math.round(
              basePercent +
                ((i + batch.length) / Math.max(1, targetIds.length)) * taskWeight
            );
            onProgress(
              Math.min(99, subProgress),
              `팔로우한 팟캐스트 이전 중... (${task.migratedCount}/${targetIds.length})`
            );
            await delayMs(90);
          }

          if (shouldCancel()) {
            task.status = task.migratedCount > 0 ? 'partial' : 'pending';
            task.errorMessage = '사용자에 의해 작업이 중단되었습니다.';
            updateReports();
            break;
          }

          task.status = 'success';
          onLog(
            'success',
            `[완료] 팔로우한 팟캐스트: ${task.migratedCount}개 추가됨 (${task.skippedCount}개 중복 건너뜀)`
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          task.status = task.migratedCount > 0 ? 'partial' : 'failed';
          task.failedCount = Math.max(
            1,
            task.totalCount - task.migratedCount - task.skippedCount
          );
          task.errorMessage = msg;
          onLog('error', `[오류] 팔로우한 팟캐스트 이전 실패: ${msg}`);
        }
        updateReports();
      }

      // 5. 개별 플레이리스트 이전 (본인 생성 플레이리스트는 트랙 복제, 타인/큐레이터 플레이리스트는 팔로우 저장)
      else if (task.category === 'playlist' && task.playlistId) {
        const plConfig = selectedPlaylists.find((p) => p.id === task.playlistId);
        if (!plConfig) continue;

        const targetName = (plConfig.customName || plConfig.name).trim();
        const targetDesc =
          (plConfig.customDescription || plConfig.description).trim() ||
          'Migrated via Migratify';

        try {
          onProgress(basePercent, `플레이리스트 '${targetName}' 처리 중...`);

          let rawTracks: SpotifyTrackItem[] | null = null;
          let isThirdPartyFollowedPlaylist = false;

          // 출발 계정 본인 소유가 아닌 타인/큐레이터 플레이리스트인 경우 불필요한 트랙 조회(403/429 유발) 없이 바로 팔로우 모드로 전환
          if (
            srcUserId &&
            plConfig.ownerId &&
            plConfig.ownerId.toLowerCase() !== srcUserId.toLowerCase()
          ) {
            isThirdPartyFollowedPlaylist = true;
          } else if (backupSource) {
            const foundPl = backupSource.playlists.find((bp) => bp.id === plConfig.id);
            rawTracks = foundPl?.tracks || [];
          } else if (plConfig.cachedTracks) {
            rawTracks = plConfig.cachedTracks.filter((t) => t.selected !== false);
          } else {
            try {
              rawTracks = await fetchPlaylistTracks(srcToken!, plConfig.id);
            } catch (readErr) {
              const errMsg =
                readErr instanceof Error ? readErr.message : String(readErr);
              // Spotify 2026 정책상 타인/큐레이터 소유 플레이리스트는 /items 조회 시 403을 반환하므로 팔로우(저장) 방식으로 전환
              if (errMsg.includes('403')) {
                isThirdPartyFollowedPlaylist = true;
              } else {
                throw readErr;
              }
            }
          }

          // 외부 큐레이터/타인 플레이리스트인 경우 새 계정 보관함에 그대로 팔로우(저장)
          if (isThirdPartyFollowedPlaylist) {
            task.totalCount = 1;
            const checkDup = await filterNonDuplicateIds(dstToken, 'playlist', [
              plConfig.id,
            ]);
            if (
              checkDup.skippedCount > 0 &&
              config.playlistDuplicateMode !== 'create_new'
            ) {
              task.skippedCount = 1;
              task.status = 'success';
              onLog(
                'info',
                `[완료] 외부 팔로우 플레이리스트 '${targetName}': 이미 새 계정에 팔로우되어 있어 건너뜁니다.`
              );
            } else {
              await saveUrisToLibrary(dstToken, 'playlist', [plConfig.id]);
              task.migratedCount = 1;
              task.status = 'success';
              onLog(
                'success',
                `[완료] 외부 팔로우 플레이리스트 '${targetName}': 새 계정 보관함에 팔로우(저장) 완료`
              );
            }
            updateReports();
            continue;
          }

          const validTracks = (rawTracks || []).filter(
            (t) =>
              t.selected !== false &&
              !t.isLocal &&
              t.id &&
              !t.id.startsWith('local-')
          );
          const localSkipped =
            (rawTracks || []).filter((t) => t.selected !== false).length -
            validTracks.length;
          task.totalCount = validTracks.length;
          updateReports();

          // 동일 이름 플레이리스트 존재 여부 확인
          const existingDstPl = dstExistingPlaylists.find(
            (dp) => dp.name.trim().toLowerCase() === targetName.toLowerCase()
          );

          if (existingDstPl && config.playlistDuplicateMode === 'skip_existing') {
            task.skippedCount = validTracks.length;
            task.status = 'skipped';
            onLog(
              'warn',
              `[건너뜀] '${targetName}' 플레이리스트가 새 계정에 이미 존재하여 건너뜁니다.`
            );
            updateReports();
            continue;
          }

          let targetPlaylistId = '';
          let existingTrackIdsSet = new Set<string>();

          if (existingDstPl && config.playlistDuplicateMode === 'merge') {
            targetPlaylistId = existingDstPl.id;
            onLog(
              'info',
              `-> 기존 '${targetName}' 플레이리스트에 누락된 곡을 병합합니다.`
            );
            try {
              const dstTracks = await fetchPlaylistTracks(dstToken, targetPlaylistId);
              existingTrackIdsSet = new Set(dstTracks.map((t) => t.id));
            } catch {
              existingTrackIdsSet = new Set<string>();
            }
          } else {
            // Spotify 2026 표준 플레이리스트 생성 엔드포인트 (POST /me/playlists)
            const created = await fetchSpotifyApi<{ id: string }>(
              '/me/playlists',
              dstToken,
              {
                method: 'POST',
                body: JSON.stringify({
                  name: targetName,
                  public: plConfig.customPublic,
                  collaborative: false,
                  description: targetDesc,
                }),
              }
            );
            targetPlaylistId = created.id;
          }

          const urisToAdd: string[] = [];
          for (const t of validTracks) {
            if (existingTrackIdsSet.has(t.id)) {
              task.skippedCount += 1;
            } else {
              urisToAdd.push(`spotify:track:${t.id}`);
            }
          }

          if (localSkipped > 0) {
            onLog(
              'warn',
              `   (안내: '${targetName}' 내 로컬 파일 ${localSkipped}곡은 API 정책상 제외되었습니다.)`
            );
          }

          for (let i = 0; i < urisToAdd.length; i += 100) {
            if (shouldCancel()) break;
            const batch = urisToAdd.slice(i, i + 100);
            // Spotify 2026 표준 플레이리스트 트랙 추가 엔드포인트 (POST /playlists/{id}/items)
            await fetchSpotifyApi(`/playlists/${targetPlaylistId}/items`, dstToken, {
              method: 'POST',
              body: JSON.stringify({ uris: batch }),
            });
            task.migratedCount += batch.length;
            updateReports();
            const subProgress = Math.round(
              basePercent +
                ((i + batch.length) / Math.max(1, urisToAdd.length)) * taskWeight
            );
            onProgress(
              Math.min(99, subProgress),
              `'${targetName}' 곡 복사 중... (${task.migratedCount}/${urisToAdd.length})`
            );
            await delayMs(90);
          }

          if (shouldCancel()) {
            task.status = task.migratedCount > 0 ? 'partial' : 'pending';
            task.errorMessage = '사용자에 의해 작업이 중단되었습니다.';
            updateReports();
            break;
          }

          task.status = 'success';
          onLog(
            'success',
            `[완료] 플레이리스트 '${targetName}': ${task.migratedCount}곡 복사됨 (${task.skippedCount}곡 중복 제외)`
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          task.status = task.migratedCount > 0 ? 'partial' : 'failed';
          task.failedCount = Math.max(
            1,
            task.totalCount - task.migratedCount - task.skippedCount
          );
          task.errorMessage = msg;
          onLog('error', `[오류] 플레이리스트 '${targetName}' 이전 실패: ${msg}`);
        }
        updateReports();
      }
    }

    if (!shouldCancel()) {
      onProgress(100, '모든 마이그레이션 작업이 완료되었습니다.');
    } else {
      onProgress(0, '사용자 요청에 의해 이전 작업이 중단되었습니다.');
    }

    return reports;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onLog('error', `[치명적 오류] 마이그레이션 도중 예외 발생: ${msg}`);
    return reports;
  }
}

// 좋아요 표시한 곡 배치 삭제 함수 (최대 40개 단위 - Spotify 2026 통합 라이브러리 DELETE /me/library?uris=... 적용)
export async function deleteLikedTracksBatch(
  accessToken: string,
  trackIds: string[]
): Promise<void> {
  if (trackIds.length === 0) return;
  for (let i = 0; i < trackIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
    const chunk = trackIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
    try {
      await removeUrisFromLibrary(accessToken, 'track', chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('400') || msg.includes('404')) {
        await fetchSpotifyApi(
          `/me/tracks?ids=${encodeURIComponent(chunk.join(','))}`,
          accessToken,
          {
            method: 'DELETE',
            body: JSON.stringify({ ids: chunk }),
          }
        ).catch(() => {
          throw err;
        });
      } else {
        throw err;
      }
    }
  }
}

// 저장한 앨범 배치 삭제 함수 (최대 40개 단위 - Spotify 2026 통합 라이브러리 DELETE /me/library?uris=... 적용)
export async function deleteSavedAlbumsBatch(
  accessToken: string,
  albumIds: string[]
): Promise<void> {
  if (albumIds.length === 0) return;
  for (let i = 0; i < albumIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
    const chunk = albumIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
    try {
      await removeUrisFromLibrary(accessToken, 'album', chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('400') || msg.includes('404')) {
        await fetchSpotifyApi(
          `/me/albums?ids=${encodeURIComponent(chunk.join(','))}`,
          accessToken,
          {
            method: 'DELETE',
            body: JSON.stringify({ ids: chunk }),
          }
        ).catch(() => {
          throw err;
        });
      } else {
        throw err;
      }
    }
  }
}

// 팔로우한 아티스트 배치 언팔로우 함수 (최대 40개 단위 - DELETE /me/following 및 통합 라이브러리 폴백)
export async function unfollowArtistsBatch(
  accessToken: string,
  artistIds: string[]
): Promise<void> {
  if (artistIds.length === 0) return;
  for (let i = 0; i < artistIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
    const chunk = artistIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
    try {
      // 1차 시도: DELETE /me/following?type=artist (Body에 ids JSON 전달)
      await fetchSpotifyApi(
        `/me/following?type=artist&ids=${encodeURIComponent(chunk.join(','))}`,
        accessToken,
        {
          method: 'DELETE',
          body: JSON.stringify({ ids: chunk }),
        }
      );
    } catch (follErr) {
      const msg = follErr instanceof Error ? follErr.message : String(follErr);
      if (msg.includes('403') || msg.includes('400') || msg.includes('404')) {
        try {
          // 2차 시도: Spotify 2026 통합 라이브러리 엔드포인트 (/me/library?uris=spotify:artist:...)
          await removeUrisFromLibrary(accessToken, 'artist', chunk);
        } catch {
          // 3차 시도: Query parameter만으로 재시도
          await fetchSpotifyApi(
            `/me/following?type=artist&ids=${encodeURIComponent(chunk.join(','))}`,
            accessToken,
            {
              method: 'DELETE',
            }
          );
        }
      } else {
        throw follErr;
      }
    }
  }
}

// 팔로우한 팟캐스트 배치 삭제 함수 (최대 40개 단위 - Spotify 2026 통합 라이브러리 DELETE /me/library?uris=... 적용)
export async function deleteSavedShowsBatch(
  accessToken: string,
  showIds: string[]
): Promise<void> {
  if (showIds.length === 0) return;
  for (let i = 0; i < showIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
    const chunk = showIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
    try {
      await removeUrisFromLibrary(accessToken, 'show', chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('400') || msg.includes('404')) {
        await fetchSpotifyApi(
          `/me/shows?ids=${encodeURIComponent(chunk.join(','))}`,
          accessToken,
          {
            method: 'DELETE',
          }
        ).catch(() => {
          throw err;
        });
      } else {
        throw err;
      }
    }
  }
}

// 플레이리스트 언팔로우(삭제) 함수
export async function unfollowPlaylist(
  accessToken: string,
  playlistId: string
): Promise<void> {
  await fetchSpotifyApi(`/playlists/${playlistId}/followers`, accessToken, {
    method: 'DELETE',
  });
}

// 계정 정리 작업 실행 파라미터 인터페이스
export interface ExecuteAccountCleanupParams {
  token: string;
  categories: AccountCleanupCategory[];
  shouldCancel?: () => boolean;
  onProgress?: (percent: number, statusText: string) => void;
  onLog?: (level: MigrationLogEntry['level'], message: string) => void;
  onReportUpdate?: (reports: AccountCleanupReport[]) => void;
}

// 선택한 계정의 데이터(플레이리스트, 좋아요, 앨범, 아티스트, 팟캐스트)를 안전하게 비우는 함수
export async function executeAccountCleanup(
  params: ExecuteAccountCleanupParams
): Promise<AccountCleanupReport[]> {
  const {
    token,
    categories,
    shouldCancel = () => false,
    onProgress = () => {},
    onLog = () => {},
    onReportUpdate = () => {},
  } = params;

  const categoryLabels: Record<AccountCleanupCategory, string> = {
    playlists: '플레이리스트',
    liked_songs: '좋아요 표시한 곡',
    saved_albums: '저장한 앨범',
    followed_artists: '팔로우한 아티스트',
    saved_shows: '팔로우한 팟캐스트',
  };

  const reports: AccountCleanupReport[] = categories.map((cat) => ({
    category: cat,
    title: categoryLabels[cat],
    totalCount: 0,
    deletedCount: 0,
    failedCount: 0,
    status: 'pending',
  }));

  const updateReports = (): void => {
    onReportUpdate([...reports]);
  };

  updateReports();

  const totalCategories = reports.length;
  if (totalCategories === 0) {
    onProgress(100, '비울 카테고리가 선택되지 않았습니다.');
    return reports;
  }

  for (let idx = 0; idx < reports.length; idx++) {
    if (shouldCancel()) {
      onLog('warn', '사용자 요청에 의해 계정 데이터 삭제가 중단되었습니다.');
      break;
    }

    const report = reports[idx];
    report.status = 'running';
    updateReports();

    const basePercent = Math.round((idx / totalCategories) * 100);
    const catWeight = 100 / totalCategories;

    try {
      // 1. 플레이리스트 삭제
      if (report.category === 'playlists') {
        onProgress(basePercent, '보관함 플레이리스트 목록을 조회하는 중...');
        onLog('info', '플레이리스트 목록을 확인합니다...');
        const playlists = await fetchUserPlaylists(token);
        report.totalCount = playlists.length;
        updateReports();

        if (playlists.length === 0) {
          report.status = 'success';
          onLog('info', '-> 삭제할 플레이리스트가 없습니다 (0개).');
          continue;
        }

        onLog('info', `-> 총 ${playlists.length}개의 플레이리스트 삭제(언팔로우) 시작`);
        for (let i = 0; i < playlists.length; i++) {
          if (shouldCancel()) break;
          const pl = playlists[i];
          try {
            await unfollowPlaylist(token, pl.id);
            report.deletedCount += 1;
          } catch (err) {
            report.failedCount += 1;
            onLog(
              'warn',
              `'${pl.name}' 플레이리스트 삭제 실패: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          updateReports();
          const p = Math.round(
            basePercent + ((i + 1) / playlists.length) * catWeight
          );
          onProgress(
            Math.min(99, p),
            `플레이리스트 정리 중... (${report.deletedCount}/${playlists.length})`
          );
          await delayMs(90);
        }

        report.status =
          report.failedCount > 0 && report.deletedCount === 0 ? 'failed' : 'success';
        onLog(
          'success',
          `[완료] 플레이리스트 정리: ${report.deletedCount}개 삭제 완료 (실패: ${report.failedCount})`
        );
      }

      // 2. 좋아요 표시한 곡 삭제
      else if (report.category === 'liked_songs') {
        onProgress(basePercent, '좋아요 표시한 곡 목록을 조회하는 중...');
        onLog('info', '좋아요 표시한 곡 목록을 확인합니다...');
        const tracks = await fetchAllLikedTracks(token);
        const validIds = tracks
          .filter((t) => t.id && !t.isLocal && !t.id.startsWith('local-'))
          .map((t) => t.id);

        report.totalCount = validIds.length;
        updateReports();

        if (validIds.length === 0) {
          report.status = 'success';
          onLog('info', '-> 삭제할 좋아요 표시 곡이 없습니다 (0곡).');
          continue;
        }

        onLog('info', `-> 총 ${validIds.length}곡의 좋아요 표시 삭제 시작`);
        for (let i = 0; i < validIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
          if (shouldCancel()) break;
          const chunk = validIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
          try {
            await deleteLikedTracksBatch(token, chunk);
            report.deletedCount += chunk.length;
          } catch (err) {
            report.failedCount += chunk.length;
            onLog(
              'warn',
              `좋아요 곡 배치 삭제 실패: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          updateReports();
          const p = Math.round(
            basePercent + ((i + chunk.length) / validIds.length) * catWeight
          );
          onProgress(
            Math.min(99, p),
            `좋아요 곡 정리 중... (${report.deletedCount}/${validIds.length})`
          );
          await delayMs(90);
        }

        report.status =
          report.failedCount > 0 && report.deletedCount === 0 ? 'failed' : 'success';
        onLog(
          'success',
          `[완료] 좋아요 표시한 곡 정리: ${report.deletedCount}곡 삭제 완료 (실패: ${report.failedCount})`
        );
      }

      // 3. 저장한 앨범 삭제
      else if (report.category === 'saved_albums') {
        onProgress(basePercent, '저장한 앨범 목록을 조회하는 중...');
        onLog('info', '저장한 앨범 목록을 확인합니다...');
        const albums = await fetchAllSavedAlbums(token);
        const albumIds = albums.map((a) => a.id).filter(Boolean);
        report.totalCount = albumIds.length;
        updateReports();

        if (albumIds.length === 0) {
          report.status = 'success';
          onLog('info', '-> 삭제할 저장된 앨범이 없습니다 (0개).');
          continue;
        }

        onLog('info', `-> 총 ${albumIds.length}개의 앨범 삭제 시작`);
        for (let i = 0; i < albumIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
          if (shouldCancel()) break;
          const chunk = albumIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
          try {
            await deleteSavedAlbumsBatch(token, chunk);
            report.deletedCount += chunk.length;
          } catch (err) {
            report.failedCount += chunk.length;
            onLog(
              'warn',
              `앨범 배치 삭제 실패: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          updateReports();
          const p = Math.round(
            basePercent + ((i + chunk.length) / albumIds.length) * catWeight
          );
          onProgress(
            Math.min(99, p),
            `앨범 정리 중... (${report.deletedCount}/${albumIds.length})`
          );
          await delayMs(90);
        }

        report.status =
          report.failedCount > 0 && report.deletedCount === 0 ? 'failed' : 'success';
        onLog(
          'success',
          `[완료] 저장한 앨범 정리: ${report.deletedCount}개 삭제 완료 (실패: ${report.failedCount})`
        );
      }

      // 4. 팔로우한 아티스트 삭제
      else if (report.category === 'followed_artists') {
        onProgress(basePercent, '팔로우한 아티스트 목록을 조회하는 중...');
        onLog('info', '팔로우한 아티스트 목록을 확인합니다...');
        const artists = await fetchAllFollowedArtists(token);
        const artistIds = artists.map((a) => a.id).filter(Boolean);
        report.totalCount = artistIds.length;
        updateReports();

        if (artistIds.length === 0) {
          report.status = 'success';
          onLog('info', '-> 언팔로우할 아티스트가 없습니다 (0명).');
          continue;
        }

        onLog('info', `-> 총 ${artistIds.length}명의 아티스트 언팔로우 시작`);
        for (let i = 0; i < artistIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
          if (shouldCancel()) break;
          const chunk = artistIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
          try {
            await unfollowArtistsBatch(token, chunk);
            report.deletedCount += chunk.length;
          } catch (err) {
            report.failedCount += chunk.length;
            onLog(
              'warn',
              `아티스트 언팔로우 실패: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          updateReports();
          const p = Math.round(
            basePercent + ((i + chunk.length) / artistIds.length) * catWeight
          );
          onProgress(
            Math.min(99, p),
            `아티스트 언팔로우 중... (${report.deletedCount}/${artistIds.length})`
          );
          await delayMs(90);
        }

        report.status =
          report.failedCount > 0 && report.deletedCount === 0 ? 'failed' : 'success';
        onLog(
          'success',
          `[완료] 팔로우한 아티스트 정리: ${report.deletedCount}명 언팔로우 완료 (실패: ${report.failedCount})`
        );
      }

      // 5. 팔로우한 팟캐스트 삭제
      else if (report.category === 'saved_shows') {
        onProgress(basePercent, '팔로우한 팟캐스트 목록을 조회하는 중...');
        onLog('info', '팔로우한 팟캐스트 목록을 확인합니다...');
        const shows = await fetchAllSavedShows(token);
        const showIds = shows.map((s) => s.id).filter(Boolean);
        report.totalCount = showIds.length;
        updateReports();

        if (showIds.length === 0) {
          report.status = 'success';
          onLog('info', '-> 삭제할 팟캐스트가 없습니다 (0개).');
          continue;
        }

        onLog('info', `-> 총 ${showIds.length}개의 팟캐스트 삭제 시작`);
        for (let i = 0; i < showIds.length; i += LIBRARY_URI_BATCH_LIMIT) {
          if (shouldCancel()) break;
          const chunk = showIds.slice(i, i + LIBRARY_URI_BATCH_LIMIT);
          try {
            await deleteSavedShowsBatch(token, chunk);
            report.deletedCount += chunk.length;
          } catch (err) {
            report.failedCount += chunk.length;
            onLog(
              'warn',
              `팟캐스트 배치 삭제 실패: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          updateReports();
          const p = Math.round(
            basePercent + ((i + chunk.length) / showIds.length) * catWeight
          );
          onProgress(
            Math.min(99, p),
            `팟캐스트 정리 중... (${report.deletedCount}/${showIds.length})`
          );
          await delayMs(90);
        }

        report.status =
          report.failedCount > 0 && report.deletedCount === 0 ? 'failed' : 'success';
        onLog(
          'success',
          `[완료] 팔로우한 팟캐스트 정리: ${report.deletedCount}개 삭제 완료 (실패: ${report.failedCount})`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.status = report.deletedCount > 0 ? 'success' : 'failed';
      report.errorMessage = msg;
      onLog('error', `[오류] ${report.title} 정리 중 예외 발생: ${msg}`);
    }

    updateReports();
  }

  if (!shouldCancel()) {
    onProgress(100, '선택한 계정 데이터 삭제가 완료되었습니다.');
  }

  return reports;
}
