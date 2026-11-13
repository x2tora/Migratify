import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationPipeline } from './MigrationPipeline';

describe('MigrationPipeline GSAP 컴포넌트 테스트', () => {
  const defaultProps = {
    isMigrating: false,
    progressPercent: 0,
    progressStatusText: '대기 중',
    totalMigratedItems: 0,
    totalSkippedItems: 0,
    workflowMode: 'account_to_account' as const,
    srcUser: {
      id: 'src_user',
      display_name: 'Source User',
    },
    dstUser: {
      id: 'dst_user',
      display_name: 'Destination User',
    },
    selectedBackupFilename: null,
  };

  it('출발 및 도착 계정 정보를 올바르게 렌더링한다', () => {
    render(<MigrationPipeline {...defaultProps} />);

    expect(screen.getByText('Source User')).toBeInTheDocument();
    expect(screen.getByText('Destination User')).toBeInTheDocument();
    expect(screen.getByText('가져올 계정')).toBeInTheDocument();
    expect(screen.getByText('받을 계정')).toBeInTheDocument();
  });

  it('마이그레이션 진행 중일 때 상태 배지와 진행 텍스트를 정상 렌더링한다', () => {
    render(
      <MigrationPipeline
        {...defaultProps}
        isMigrating={true}
        progressPercent={45}
        progressStatusText="좋아요 표시한 곡 이전 중..."
        runningTaskTitle="좋아요 표시한 곡"
        totalMigratedItems={120}
        totalSkippedItems={10}
      />
    );

    expect(screen.getByText('좋아요 표시한 곡 이전 중...')).toBeInTheDocument();
    expect(screen.getByText('좋아요 표시한 곡')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('완료 시 완료됨 텍스트 및 프로그레스 100%를 정상 렌더링한다', () => {
    render(
      <MigrationPipeline
        {...defaultProps}
        isMigrating={false}
        progressPercent={100}
        progressStatusText="이전 완료"
        totalMigratedItems={500}
        totalSkippedItems={25}
      />
    );

    expect(screen.getByText('완료됨')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
