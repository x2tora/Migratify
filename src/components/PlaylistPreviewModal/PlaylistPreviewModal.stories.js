import { PlaylistPreviewModal } from './PlaylistPreviewModal';

// PlaylistPreviewModal 스토리북 설정
export default {
  title: 'Components/PlaylistPreviewModal',
  component: PlaylistPreviewModal,
};

export const WithSampleTracks = {
  args: {
    playlist: {
      id: 'pl1',
      name: '새벽 드라이브 플레이리스트',
      description: '감성 신스웨이브 모음',
      ownerId: 'xitora',
      ownerName: 'xitora',
      public: false,
      collaborative: false,
      tracksTotal: 2,
      selected: true,
      customName: '새벽 드라이브 플레이리스트',
      customDescription: '감성 신스웨이브 모음',
      customPublic: false,
    },
    tracks: [
      {
        id: 't1',
        uri: 'spotify:track:t1',
        name: 'Midnight City',
        artists: ['M83'],
        albumName: "Hurry Up, We're Dreaming",
        durationMs: 243000,
        isLocal: false,
      },
      {
        id: 't2',
        uri: 'spotify:track:t2',
        name: 'Nightcall',
        artists: ['Kavinsky'],
        albumName: 'OutRun',
        durationMs: 258000,
        isLocal: false,
      },
    ],
    isLoadingTracks: false,
    onSaveCustomization: () => {},
    onClose: () => {},
  },
};
