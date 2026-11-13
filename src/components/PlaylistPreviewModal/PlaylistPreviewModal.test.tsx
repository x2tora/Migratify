import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistPreviewModal } from './PlaylistPreviewModal';

// PlaylistPreviewModal 단위 테스트
describe('PlaylistPreviewModal 컴포넌트 테스트', () => {
  const samplePlaylist = {
    id: 'pl-1',
    name: '코딩할 때 듣는 음악',
    description: '집중력 향상',
    ownerId: 'xitora',
    ownerName: 'xitora',
    public: false,
    collaborative: false,
    tracksTotal: 1,
    selected: true,
    customName: '코딩할 때 듣는 음악',
    customDescription: '집중력 향상',
    customPublic: false,
  };

  const sampleTracks = [
    {
      id: 'tr-1',
      uri: 'spotify:track:tr-1',
      name: 'Veridis Quo',
      artists: ['Daft Punk'],
      albumName: 'Discovery',
      durationMs: 345000,
      isLocal: false,
    },
  ];

  it('수록곡 목록을 표시하고 이름을 수정해 저장할 수 있다', () => {
    const onSave = jest.fn();
    render(
      <PlaylistPreviewModal
        playlist={samplePlaylist}
        tracks={sampleTracks}
        isLoadingTracks={false}
        onSaveCustomization={onSave}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Veridis Quo')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('새 계정에 생성할 플레이리스트 이름');
    fireEvent.change(nameInput, { target: { value: '새 계정 코딩 음악' } });
    fireEvent.click(screen.getByText('설정 저장'));

    expect(onSave).toHaveBeenCalledWith('pl-1', {
      customName: '새 계정 코딩 음악',
      customDescription: '집중력 향상',
      customPublic: false,
      cachedTracks: [
        expect.objectContaining({
          id: 'tr-1',
          name: 'Veridis Quo',
          selected: true,
        }),
      ],
    });
  });
});
