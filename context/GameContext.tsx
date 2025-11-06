import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { Room, GameStatus, GameAction } from '../types';

const initialState: Room = {
  roomId: null,
  playerCount: 1,
  questions: [],
  usedQuestions: [],
  status: 'waiting',
  currentQuestion: null,
  hostId: null,
};

const gameReducer = (state: Room, action: GameAction): Room => {
  switch (action.type) {
    case 'CREATE_ROOM':
      return {
        ...initialState,
        roomId: action.payload.roomId,
        hostId: action.payload.hostId,
        playerCount: 1,
        questions: [],
        usedQuestions: [],
        status: 'waiting',
      };
    case 'JOIN_ROOM':
      return { ...state, ...action.payload };
    case 'SUBMIT_QUESTION':
      // Optimistic update
      return { ...state, questions: [...state.questions, action.payload] };
    case 'UPDATE_STATE':
        return {...state, ...action.payload };
    case 'START_GAME':
      return { ...state, status: 'playing' };
    case 'DRAW_QUESTION':
        // This is now handled by polling UPDATE_STATE, but we can keep for optimistic updates if needed
      return {
          ...state,
          currentQuestion: action.payload.question,
          questions: action.payload.remainingQuestions,
          usedQuestions: [...state.usedQuestions, action.payload.question]
      };
    case 'END_GAME':
        return { ...state, status: 'ended' };
    case 'LEAVE_GAME':
        return initialState;
    default:
      return state;
  }
};

export const GameContext = createContext<{
  gameState: Room;
  dispatch: React.Dispatch<GameAction>;
}>({
  gameState: initialState,
  dispatch: () => null,
});

// --- LocalStorage Mock Service ---
// This simulates a backend by using the browser's localStorage, which is
// shared across tabs of the same origin. This fixes the multi-tab issue.
// NOTE: This will NOT work across different devices (e.g., PC and phone).

const STORAGE_KEY = 'truth-or-dare-all-rooms';

const getRoomsFromStorage = (): { [key: string]: Room } => {
    try {
        const roomsStr = localStorage.getItem(STORAGE_KEY);
        return roomsStr ? JSON.parse(roomsStr) : {};
    } catch (e) {
        console.error("Failed to parse rooms from localStorage", e);
        return {};
    }
};

const saveRoomsToStorage = (rooms: { [key: string]: Room }) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    } catch (e) {
        console.error("Failed to save rooms to localStorage", e);
    }
};

export const gameService = {
    createRoom: async (): Promise<Room> => {
        const rooms = getRoomsFromStorage();
        let roomId;
        // Ensure unique room ID
        do {
            roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        } while (rooms[roomId]);
        
        const hostId = Math.random().toString(36).substring(2);
        const newRoom: Room = { ...initialState, roomId, hostId, playerCount: 1 };
        
        rooms[roomId] = newRoom;
        saveRoomsToStorage(rooms);
        
        return newRoom;
    },
    getRoom: async (roomId: string): Promise<Room | null> => {
        const rooms = getRoomsFromStorage();
        return rooms[roomId] || null;
    },
    joinRoom: async (roomId: string): Promise<Room | null> => {
        const rooms = getRoomsFromStorage();
        if (rooms[roomId]) {
            rooms[roomId].playerCount += 1;
            saveRoomsToStorage(rooms);
            return rooms[roomId];
        }
        return null;
    },
    submitQuestion: async (roomId: string, question: string): Promise<void> => {
        const rooms = getRoomsFromStorage();
        if (rooms[roomId]) {
            rooms[roomId].questions.push(question);
            saveRoomsToStorage(rooms);
        }
    },
    startGame: async (roomId: string): Promise<void> => {
         const rooms = getRoomsFromStorage();
         if (rooms[roomId]) {
            rooms[roomId].status = 'playing';
            saveRoomsToStorage(rooms);
        }
    },
    drawQuestion: async (roomId: string): Promise<void> => {
        const rooms = getRoomsFromStorage();
        const room = rooms[roomId];
        if (room) {
             if (room.questions.length > 0) {
                const questions = [...room.questions];
                const qIndex = Math.floor(Math.random() * questions.length);
                const question = questions.splice(qIndex, 1)[0];
                room.currentQuestion = question;
                room.questions = questions;
                room.usedQuestions.push(question);
            } else {
                room.status = 'ended';
            }
            saveRoomsToStorage(rooms);
        }
    },
    leaveGame: async (roomId: string): Promise<void> => {
      localStorage.removeItem('truth-game-room');
      const rooms = getRoomsFromStorage();
      if (rooms[roomId]) {
        rooms[roomId].playerCount = Math.max(0, rooms[roomId].playerCount - 1);
        // If the room is empty, remove it to prevent clutter in localStorage
        if (rooms[roomId].playerCount === 0) {
            delete rooms[roomId];
        }
        saveRoomsToStorage(rooms);
      }
    }
}

const useRealtimeUpdates = (roomId: string | null, dispatch: React.Dispatch<GameAction>) => {
    useEffect(() => {
        if (!roomId) return;

        // Poll for updates every 3 seconds.
        // This now works because localStorage is shared between tabs.
        const intervalId = setInterval(async () => {
            const roomState = await gameService.getRoom(roomId);
            if (roomState) {
                dispatch({ type: 'UPDATE_STATE', payload: roomState });
            } else {
                // Room was likely deleted or session expired
                dispatch({ type: 'LEAVE_GAME' });
            }
        }, 3000);

        return () => clearInterval(intervalId);
    }, [roomId, dispatch]);
};


export const GameProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  
  useRealtimeUpdates(gameState.roomId, dispatch);

  useEffect(() => {
    const rejoinSession = async () => {
        try {
            const savedSession = localStorage.getItem('truth-game-room');
            if (savedSession) {
                const { roomId } = JSON.parse(savedSession);
                if (roomId) {
                    // We don't call joinRoom here on load because a page refresh isn't a "new" player.
                    // We just need to get the latest state of the room.
                    const roomState = await gameService.getRoom(roomId);
                    if (roomState) {
                        dispatch({ type: 'JOIN_ROOM', payload: roomState });
                    } else {
                        // The room doesn't exist anymore on the "backend"
                        localStorage.removeItem('truth-game-room');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to parse or rejoin saved session", e);
            localStorage.removeItem('truth-game-room');
        }
    };
    rejoinSession();
  }, []);

  return (
    <GameContext.Provider value={{ gameState, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};