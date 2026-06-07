import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { MobileChatPage } from '@/mobile/MobileChatPage.jsx';
import { withSuspense, LazyChatIAPage } from '@/routes/lazyPages.jsx';

export const ChatEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileChatPage />
    : withSuspense(LazyChatIAPage, 'Chargement assistant…')
);
