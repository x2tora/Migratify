import React from 'react';
import { Tooltip } from './Tooltip';
import { Trash2, HelpCircle } from 'lucide-react';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
};

// 기본 하단 툴팁 스토리
export const BottomPlacement = () => (
  <div className="p-12 flex justify-center items-center bg-zinc-950 text-white min-h-[200px]">
    <Tooltip content="계정 데이터 삭제" side="bottom">
      <button
        type="button"
        className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-rose-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </Tooltip>
  </div>
);

// 상단 툴팁 스토리
export const TopPlacement = () => (
  <div className="p-12 flex justify-center items-center bg-zinc-950 text-white min-h-[200px]">
    <Tooltip content="사용 가이드 (F1)" side="top">
      <button
        type="button"
        className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-spotify"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </Tooltip>
  </div>
);
