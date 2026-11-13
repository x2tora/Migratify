import { AccountCleanerModal } from './AccountCleanerModal';

// AccountCleanerModal 스토리북 설정
export default {
  title: 'Components/AccountCleanerModal',
  component: AccountCleanerModal,
};

export const DefaultView = {
  args: {
    isOpen: true,
    onClose: () => {},
    srcUser: {
      id: 'src_user_1',
      display_name: '기존 계정 사용자',
    },
    dstUser: {
      id: 'dst_user_2',
      display_name: '새 도착 계정',
    },
    srcToken: 'mock_src_token',
    dstToken: 'mock_dst_token',
    onCleanupFinished: () => {},
  },
};
