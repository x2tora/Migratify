import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Sidebar 단위 테스트
describe('Sidebar 컴포넌트 테스트', () => {
  it('4개의 워크플로우 단계와 계정 연결 상태를 표시한다', () => {
    render(
      <Sidebar
        currentStep={1}
        maxReachedStep={2}
        srcUser={{ id: 'u1', display_name: 'xitora' }}
        dstUser={null}
        hasBackupLoaded={false}
        onSelectStep={jest.fn()}
        onOpenStepTutorial={jest.fn()}
      />
    );

    expect(screen.getByText('1. API 자격 증명')).toBeInTheDocument();
    expect(screen.getByText('2. 계정 연결')).toBeInTheDocument();
    expect(screen.getAllByText('xitora').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('미연결')).toBeInTheDocument();
  });

  it('도달한 단계를 클릭하면 onSelectStep이 호출된다', () => {
    const onSelectStep = jest.fn();
    render(
      <Sidebar
        currentStep={1}
        maxReachedStep={2}
        srcUser={null}
        dstUser={null}
        hasBackupLoaded={false}
        onSelectStep={onSelectStep}
        onOpenStepTutorial={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('1. API 자격 증명'));
    expect(onSelectStep).toHaveBeenCalledWith(0);
  });

  it('2단계에 있더라도 이미 도달했던 3단계로 이동할 수 있다', () => {
    const onSelectStep = jest.fn();
    render(
      <Sidebar
        currentStep={1}
        maxReachedStep={2}
        srcUser={null}
        dstUser={null}
        hasBackupLoaded={false}
        onSelectStep={onSelectStep}
        onOpenStepTutorial={jest.fn()}
      />
    );

    const step3Btn = screen.getByText('3. 이전 항목 선택').closest('button');
    expect(step3Btn).not.toBeDisabled();
    if (step3Btn) fireEvent.click(step3Btn);
    expect(onSelectStep).toHaveBeenCalledWith(2);

    const step4Btn = screen.getByText('4. 데이터 이전').closest('button');
    expect(step4Btn).toBeDisabled();
  });

  it('제작자 링크 호버 시 툴팁이 정상 표시되고 클릭 시 외부 브라우저가 열린다', () => {
    const mockOpenExternal = jest.fn();
    (window as any).electronAPI = {
      openExternal: mockOpenExternal,
    };

    render(
      <Sidebar
        currentStep={1}
        maxReachedStep={2}
        srcUser={null}
        dstUser={null}
        hasBackupLoaded={false}
        onSelectStep={jest.fn()}
        onOpenStepTutorial={jest.fn()}
      />
    );

    const linkBtn = screen.getByRole('button', { name: 'xitora.cc 공식 홈페이지 방문' });
    expect(linkBtn).toBeInTheDocument();

    fireEvent.mouseEnter(linkBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('xitora.cc 공식 홈페이지 방문');

    fireEvent.click(linkBtn);
    expect(mockOpenExternal).toHaveBeenCalledWith('https://xitora.cc');
  });

  it('workflowMode에 따라 단계 설명이 알맞게 변경된다', () => {
    const { rerender } = render(
      <Sidebar
        currentStep={1}
        maxReachedStep={1}
        srcUser={null}
        dstUser={null}
        hasBackupLoaded={false}
        workflowMode="create_backup"
        onSelectStep={jest.fn()}
        onOpenStepTutorial={jest.fn()}
      />
    );
    expect(screen.getByText('백업할 계정 로그인')).toBeInTheDocument();
    expect(screen.getByText('백업 파일 생성 및 저장')).toBeInTheDocument();

    rerender(
      <Sidebar
        currentStep={1}
        maxReachedStep={1}
        srcUser={null}
        dstUser={null}
        hasBackupLoaded={false}
        workflowMode="delete_account_data"
        onSelectStep={jest.fn()}
        onOpenStepTutorial={jest.fn()}
      />
    );
    expect(screen.getByText('정리할 계정 로그인')).toBeInTheDocument();
    expect(screen.getByText('선택한 계정 데이터 삭제')).toBeInTheDocument();
  });
});
