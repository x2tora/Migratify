import { Sidebar } from './Sidebar';

// Sidebar 스토리북 설정
export default {
  title: 'Components/Sidebar',
  component: Sidebar,
};

export constConnectedAccounts = {
  args: {
    currentStep: 1,
    maxReachedStep: 2,
    srcUser: { id: 'xitora', display_name: 'xitora' },
    dstUser: { id: 'new_user', display_name: 'NewSpotifyUser' },
    hasBackupLoaded: false,
    onSelectStep: () => {},
    onOpenStepTutorial: () => {},
  },
};
