import create from 'zustand';

const useStore = create((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  // Add other actions as needed
}));

export default useStore;