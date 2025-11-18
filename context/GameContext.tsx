import React, { createContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { Room, GameAction } from '../types';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface LocalGameState extends Room {
  clientId: string | null;
}

const initialState: LocalGameState = {
  roomId: null,
  playerCount: 1,
  questions: [],
  usedQuestions: [],
  status: 'waiting',
  currentQuestion: null,
  hostId: null,
  clientId: null,
};

const gameReducer = (state: LocalGameState, action: GameAction): LocalGameState => {
  switch (action.type) {
    case 'CREATE_ROOM':
      return {
        ...initialState,
        roomId: action.payload.roomId,
        hostId: action.payload.hostId,
        clientId: action.payload.hostId, // The creator is the host
        playerCount: 1,
        questions: [],
        usedQuestions: [],
        status: 'waiting',
      };
    case 'JOIN_ROOM':
      return { ...state, ...action.payload };
    case 'SET_CLIENT_ID':
        return { ...state, clientId: action.payload.clientId };
    case 'SUBMIT_QUESTION':
      // Optimistic update for responsiveness
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
        // Keep clientId but reset the rest
        return { ...initialState, clientId: state.clientId };
    default:
      return state;
  }
};

export const GameContext = createContext<{
  gameState: LocalGameState;
  isHost: boolean;
  sendPlayerAction: (action: { type: string; payload?: any }) => void;
  dispatch: React.Dispatch<GameAction>;
}>({
  gameState: initialState,
  isHost: false,
  sendPlayerAction: () => null,
  dispatch: () => null,
});

// --- Supabase Backend Service ---
const generateId = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// These functions are now only called by the host
export const gameService = {
    createRoom: async (): Promise<Room> => {
        let newRoomId = '';
        let roomExists = true;
        while (roomExists) {
            newRoomId = generateId(4);
            const { data } = await supabase.from('rooms').select('room_id').eq('room_id', newRoomId).single();
            if (!data) roomExists = false;
        }
        
        const hostId = generateId(10);
        const newRoomData: Omit<LocalGameState, 'clientId'> = {
            ...initialState,
            roomId: newRoomId,
            hostId: hostId,
        };

        const { error } = await supabase.from('rooms').insert({ room_id: newRoomId, state: newRoomData });
        if (error) throw error;

        return newRoomData as Room;
    },
    getRoom: async (roomId: string): Promise<Room | null> => {
        const { data, error } = await supabase.from('rooms').select('state').eq('room_id', roomId).single();
        if (error || !data) return null;
        return data.state as Room;
    },
    joinRoom: async (roomId: string): Promise<Room | null> => {
        const room = await gameService.getRoom(roomId);
        if (!room) return null;
        room.playerCount += 1;
        const { error } = await supabase.from('rooms').update({ state: room }).eq('room_id', roomId);
        if (error) throw error;
        return room;
    },
    submitQuestion: async (roomId: string, question: string): Promise<void> => {
        const room = await gameService.getRoom(roomId);
        if (room) {
            room.questions.push(question);
            await supabase.from('rooms').update({ state: room }).eq('room_id', roomId);
        }
    },
    startGame: async (roomId: string): Promise<void> => {
        const room = await gameService.getRoom(roomId);
        if (room) {
            room.status = 'playing';
            await supabase.from('rooms').update({ state: room }).eq('room_id', roomId);
        }
    },
    drawQuestion: async (roomId: string): Promise<void> => {
        const room = await gameService.getRoom(roomId);
        if (room) {
            if(room.questions.length > 0) {
                const qIndex = Math.floor(Math.random() * room.questions.length);
                const [drawnQuestion] = room.questions.splice(qIndex, 1);
                room.currentQuestion = drawnQuestion;
                room.usedQuestions.push(drawnQuestion);
            } else {
                room.status = 'ended';
            }
            await supabase.from('rooms').update({ state: room }).eq('room_id', roomId);
        }
    },
    leaveGame: async (): Promise<void> => {
      localStorage.removeItem('truth-game-session');
    }
}

export const GameProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isHost = gameState.hostId !== null && gameState.clientId === gameState.hostId;

  // Rejoin session from localStorage
  useEffect(() => {
    const rejoinSession = async () => {
        try {
            const savedSession = localStorage.getItem('truth-game-session');
            if (savedSession) {
                const { roomId, clientId } = JSON.parse(savedSession);
                if (roomId && clientId) {
                    const roomState = await gameService.getRoom(roomId);
                    if (roomState) {
                        dispatch({ type: 'JOIN_ROOM', payload: roomState });
                        dispatch({ type: 'SET_CLIENT_ID', payload: { clientId } });
                    } else {
                        localStorage.removeItem('truth-game-session');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to rejoin session", e);
            localStorage.removeItem('truth-game-session');
        }
    };
    rejoinSession();
  }, []);

  // Manage Supabase real-time connection
  useEffect(() => {
    if (!gameState.roomId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Join channel if it's new
    if (!channelRef.current || channelRef.current.topic !== `room:${gameState.roomId}`) {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }
        const newChannel = supabase.channel(`room:${gameState.roomId}`);
        channelRef.current = newChannel;

        // Everyone listens for state updates from the DB
        newChannel.on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_id=eq.${gameState.roomId}` },
            (payload) => {
                dispatch({ type: 'UPDATE_STATE', payload: payload.new.state as Room });
            }
        ).subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') console.error('Real-time channel error:', err);
        });
    }

    // Host also listens for actions broadcast by other players
    if (isHost && channelRef.current) {
        const playerActionListener = channelRef.current.on('broadcast', { event: 'player_action' }, ({ payload }) => {
            switch (payload.type) {
              case 'SUBMIT_QUESTION':
                gameService.submitQuestion(gameState.roomId!, payload.payload);
                break;
              case 'START_GAME':
                gameService.startGame(gameState.roomId!);
                break;
              case 'DRAW_QUESTION':
                gameService.drawQuestion(gameState.roomId!);
                break;
            }
        });
        
        // Cleanup listener when host status changes or component unmounts
        return () => {
            if (channelRef.current) {
                channelRef.current.off('broadcast', { event: 'player_action' });
            }
        };
    }
  }, [gameState.roomId, isHost]);

  // Function for components to send actions
  const sendPlayerAction = (action: { type: string; payload?: any }) => {
    if (!gameState.roomId) return;
    
    const handler = () => {
        switch (action.type) {
            case 'SUBMIT_QUESTION':
                gameService.submitQuestion(gameState.roomId!, action.payload);
                break;
            case 'START_GAME':
                gameService.startGame(gameState.roomId!);
                break;
            case 'DRAW_QUESTION':
                gameService.drawQuestion(gameState.roomId!);
                break;
        }
    }

    if (isHost) {
      handler();
    } else {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_action',
        payload: action,
      });
    }
  };


  return (
    <GameContext.Provider value={{ gameState, isHost, sendPlayerAction, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};
