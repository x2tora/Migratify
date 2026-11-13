import { TutorialDrawer } from './TutorialDrawer';

// TutorialDrawer 스토리북 설정
export default {
  title: 'Components/TutorialDrawer',
  component: TutorialDrawer,
};

export const OpenDrawer = {
  args: {
    isOpen: true,
    activeStepIndex: 1,
    checklistState: {
      created_app: true,
      redirect_uri_saved: true,
    },
    onToggleChecklist: () => {},
    onClose: () => {},
  },
};
