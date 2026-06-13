/** Classes input auth partagées login/signup – sans refonte layout. */
export const getAuthInputClass = (mobileAuth = false) => (
  mobileAuth ? 'h-12 text-base md:h-10 md:text-sm' : ''
);
