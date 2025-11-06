
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

// Service to interact with a backend API.
// In a real app, these endpoints (/api/...) would need to be created.
export const gameService = {
    createRoom: async (): Promise<Room> => {
        // In a real backend, this would create a room and return its state.
        // For now, we'll mock the response.
        console.log("TODO: Implement POST /api/room");
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hostId = Math.random().toString(36).substring(2);
        const newRoom = { ...initialState, roomId, hostId };
        // This is a placeholder for a real backend. You would replace this logic.
        (window as any)._mockRooms = (window as any)._mockRooms || {};
        (window as any)._mockRooms[roomId] = newRoom;
        return newRoom;
    },
    getRoom: async (roomId: string): Promise<Room | null> => {
        console.log(`TODO: Implement GET /api/room/${roomId}`);
        const rooms = (window as any)._mockRooms || {};
        return rooms[roomId] || null;
    },
    joinRoom: async (roomId: string): Promise<Room | null> => {
        console.log(`TODO: Implement POST /api/room/${roomId}/join`);
        const rooms = (window as any)._mockRooms || {};
        if (rooms[roomId]) {
            rooms[roomId].playerCount += 1;
            return rooms[roomId];
        }
        return null;
    },
    submitQuestion: async (roomId: string, question: string): Promise<void> => {
        console.log(`TODO: Implement POST /api/room/${roomId}/question`);
        const rooms = (window as any)._mockRooms || {};
        if (rooms[roomId]) {
            rooms[roomId].questions.push(question);
        }
    },
    startGame: async (roomId: string): Promise<void> => {
         console.log(`TODO: Implement POST /api/room/${roomId}/start`);
         const rooms = (window as any)._mockRooms || {};
         if (rooms[roomId]) {
            rooms[roomId].status = 'playing';
        }
    },
    drawQuestion: async (roomId: string): Promise<void> => {
        console.log(`TODO: Implement POST /api/room/${roomId}/draw`);
        const rooms = (window as any)._mockRooms || {};
        if (rooms[roomId] && rooms[roomId].questions.length > 0) {
            const questions = [...rooms[roomId].questions];
            const qIndex = Math.floor(Math.random() * questions.length);
            const question = questions.splice(qIndex, 1)[0];
            rooms[roomId].currentQuestion = question;
            rooms[roomId].questions = questions;
            rooms[roomId].usedQuestions.push(question);
        } else if (rooms[roomId]) {
            rooms[roomId].status = 'ended';
        }
    },
    leaveGame: async (roomId: string): Promise<void> => {
      console.log(`TODO: Implement POST /api/room/${roomId}/leave`);
      localStorage.removeItem('truth-game-room');
      const rooms = (window as any)._mockRooms || {};
      if (rooms[roomId]) {
        rooms[roomId].playerCount = Math.max(0, rooms[roomId].playerCount - 1);
        // In a real backend, you might delete the room if playerCount is 0
      }
    }
}

const useRealtimeUpdates = (roomId: string | null, dispatch: React.Dispatch<GameAction>) => {
    useEffect(() => {
        if (!roomId) return;

        // Poll for updates every 3 seconds.
        // In a production app, you would use WebSockets for real-time updates.
        const intervalId = setInterval(async () => {
            const roomState = await gameService.getRoom(roomId);
            if (roomState) {
                dispatch({ type: 'UPDATE_STATE', payload: roomState });
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
                    const roomState = await gameService.joinRoom(roomId); // Re-join to increment player count
                    if (roomState) {
                        dispatch({ type: 'JOIN_ROOM', payload: roomState });
                    } else {
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
