

import {createContext, useContext, type ReactNode} from 'react';
import {useAuthStore} from '../store/authStore';

type MembershipType = 'none' | 'pro' | 'premium' | 'special' | 'junior' | 'general';

type MembershipContextValue = {
  membershipType: MembershipType;
  isPremium: boolean;
};

const MembershipContext = createContext<MembershipContextValue>({
  membershipType: 'none',
  isPremium: false,
});

export function MembershipProvider({children}: {children: ReactNode}) {
  const membershipType = (useAuthStore(state => state.customer?.membershipType) ||
    'none') as MembershipType;

  return (
    <MembershipContext.Provider
      value={{
        membershipType,
        isPremium: membershipType === 'premium',
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}