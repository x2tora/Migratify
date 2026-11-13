import { TutorialModal } from './TutorialModal';
import { STEP_TUTORIAL_GUIDES } from '../../data/tutorials';

// TutorialModal 스토리북 설정
export default {
  title: 'Components/TutorialModal',
  component: TutorialModal,
};

export const Step1Guide = {
  args: {
    isOpen: true,
    guide: STEP_TUTORIAL_GUIDES[0],
    autoShowDisabled: false,
    onToggleAutoShow: () => {},
    onClose: () => {},
  },
};
