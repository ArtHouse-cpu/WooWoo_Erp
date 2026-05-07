import {configureStore} from "@reduxjs/toolkit";
import userReducer, {type UserState} from "./slices/userSlice";

const USER_STATE_STORAGE_KEY = "wooerp-redux-user";

const loadUserState = (): UserState | undefined => {
  try {
    const raw = localStorage.getItem(USER_STATE_STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as UserState;
  } catch {
    return undefined;
  }
};

const saveUserState = (state: UserState) => {
  try {
    localStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    
  }
};


const preloadedUserState = loadUserState();

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
  preloadedState: preloadedUserState
    ? {
        user: preloadedUserState,
      }
    : undefined,
});

store.subscribe(() => {
  saveUserState(store.getState().user as UserState);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
