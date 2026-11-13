import { TitleBar } from './TitleBar';

// TitleBar 스토리북 설정
export default {
  title: 'Components/TitleBar',
  component: TitleBar,
};

export const DefaultDark = {
  args: {
    currentStepIndex: 0,
    isDarkMode: true,
    onToggleDarkMode: () => {},
    onOpenStepTour: () => {},
    onToggleHelpDrawer: () => {},
    onOpenCleanerModal: () => {},
  },
};

export const LightMode = {
  args: {
    currentStepIndex: 1,
    isDarkMode: false,
    onToggleDarkMode: () => {},
    onOpenStepTour: () => {},
    onToggleHelpDrawer: () => {},
    onOpenCleanerModal: () => {},
  },
};
