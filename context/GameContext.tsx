
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
      };
    case 'JOIN_ROOM':
      return { ...state, ...action.payload };
    case 'SUBMIT_QUESTION':
      return { ...state, questions: [...state.questions, action.payload] };
    case 'UPDATE_STATE':
        return {...state, ...action.payload };
    case 'START_GAME':
      return { ...state, status: 'playing' };
    case 'DRAW_QUESTION':
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

// A mock real-time subscription
const listeners: { [key: string]: React.Dispatch<GameAction> } = {};
const rooms: { [key: string]: Room } = {};

const useMockRealtime = (roomId: string | null, dispatch: React.Dispatch<GameAction>) => {
    useEffect(() => {
        const clientId = Math.random().toString(36).substring(2);
        if (roomId) {
            listeners[clientId] = dispatch;

            // Simulate joining and getting current state
            if (rooms[roomId]) {
                dispatch({ type: 'UPDATE_STATE', payload: rooms[roomId] });
            }
        }
        
        return () => {
            delete listeners[clientId];
        };
    }, [roomId, dispatch]);
};

// Mock "cloud functions"
export const broadcastState = (roomId: string | null) => {
    if (roomId && rooms[roomId]) {
        Object.values(listeners).forEach(dispatch => {
            dispatch({ type: 'UPDATE_STATE', payload: rooms[roomId] });
        });
    }
}

export const gameService = {
    createRoom: (): Room => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hostId = Math.random().toString(36).substring(2);
        const newRoom = { ...initialState, roomId, hostId };
        rooms[roomId] = newRoom;
        localStorage.setItem('truth-game-room', JSON.stringify({ roomId, clientId: hostId }));
        return newRoom;
    },
    joinRoom: (roomId: string): Room | null => {
        if (rooms[roomId]) {
            rooms[roomId].playerCount += 1;
            const clientId = Math.random().toString(36).substring(2);
            localStorage.setItem('truth-game-room', JSON.stringify({ roomId, clientId }));
            broadcastState(roomId);
            return rooms[roomId];
        }
        return null;
    },
    submitQuestion: (roomId: string, question: string): void => {
        if (rooms[roomId]) {
            rooms[roomId].questions.push(question);
            broadcastState(roomId);
        }
    },
    startGame: (roomId: string): void => {
         if (rooms[roomId]) {
            rooms[roomId].status = 'playing';
            broadcastState(roomId);
        }
    },
    drawQuestion: (roomId: string): void => {
        if (rooms[roomId] && rooms[roomId].questions.length > 0) {
            const questions = [...rooms[roomId].questions];
            const qIndex = Math.floor(Math.random() * questions.length);
            const question = questions.splice(qIndex, 1)[0];
            rooms[roomId].currentQuestion = question;
            rooms[roomId].questions = questions;
            rooms[roomId].usedQuestions.push(question);
            broadcastState(roomId);
        } else if (rooms[roomId]) {
            rooms[roomId].status = 'ended';
            broadcastState(roomId);
        }
    },
    leaveGame: (roomId: string): void => {
      localStorage.removeItem('truth-game-room');
      if (rooms[roomId]) {
        rooms[roomId].playerCount = Math.max(0, rooms[roomId].playerCount - 1);
        if (rooms[roomId].playerCount === 0) {
            delete rooms[roomId];
        } else {
            broadcastState(roomId);
        }
      }
    }
}

export const GameProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  
  useMockRealtime(gameState.roomId, dispatch);

  useEffect(() => {
    try {
        const savedSession = localStorage.getItem('truth-game-room');
        if (savedSession) {
            const { roomId } = JSON.parse(savedSession);
            if (roomId && rooms[roomId]) {
                dispatch({ type: 'JOIN_ROOM', payload: rooms[roomId] });
            } else {
                localStorage.removeItem('truth-game-room');
            }
        }
    } catch (e) {
        console.error("Failed to parse saved session", e);
        localStorage.removeItem('truth-game-room');
    }
  }, []);

  return (
    <GameContext.Provider value={{ gameState, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};
