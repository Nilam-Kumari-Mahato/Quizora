import { create } from 'zustand';

interface AppState {
    count: number;
    theme: 'light' | 'dark';
    increment: () => void;
    decrement: () => void;
    reset: () => void;
    toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    count: 0,
    theme: 'light',
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
    toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
