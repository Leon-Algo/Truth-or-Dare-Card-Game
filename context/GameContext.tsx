import React, { createContext, useReducer, useEffect, ReactNode, useRef, useCallback } from 'react';
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
        const { data, error } = await supabase.rpc('join_room', { p_room_id: roomId });
        if (error) throw error;
        return data as Room;
    },
    leaveRoom: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
        if (error) console.error("Failed to leave room:", error);
    },
    submitQuestion: async (roomId: string, question: string): Promise<void> => {
        const { error } = await supabase.rpc('submit_question', { p_room_id: roomId, p_question: question });
        if (error) throw error;
    },
    startGame: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('start_game', { p_room_id: roomId });
        if (error) throw error;
    },
    drawQuestion: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('draw_question', { p_room_id: roomId });
        if (error) throw error;
    },
    leaveGame: async (): Promise<void> => {
      try {
        localStorage.removeItem('truth-game-session');
      } catch (e) {
        console.error("Could not clear session from localStorage", e);
      }
    }
}

export const GameProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isHost = gameState.hostId !== null && gameState.clientId === gameState.hostId;

  // Use refs to get the latest state in stable callbacks without re-triggering effects.
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

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

  const handlePlayerAction = useCallback(async ({ payload }: { payload: { type: string; payload?: any } }) => {
    const currentIsHost = isHostRef.current;
    const currentGameState = gameStateRef.current;

    if (!currentIsHost || !currentGameState.roomId) return;
    
    switch (payload.type) {
      case 'SUBMIT_QUESTION':
        await gameService.submitQuestion(currentGameState.roomId, payload.payload);
        break;
      case 'START_GAME':
        await gameService.startGame(currentGameState.roomId);
        break;
      case 'DRAW_QUESTION':
        await gameService.drawQuestion(currentGameState.roomId);
        break;
    }
  }, []); // Empty dependency array ensures this function reference is stable

  // Effect 1: Manages the channel lifecycle based ONLY on roomId
  useEffect(() => {
    if (!gameState.roomId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`room:${gameState.roomId}`);
    channelRef.current = channel;

    // General listener for all players
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `room_id=eq.${gameState.roomId}` },
        (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new.state) {
              dispatch({ type: 'UPDATE_STATE', payload: payload.new.state as Room });
            }
        }
    );
    
    if(channel.state !== 'joined') {
        channel.subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') console.error('Real-time channel error:', err);
        });
    }

    return () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };
  }, [gameState.roomId]);

  // Effect 2: Manages the host-specific broadcast listener based ONLY on isHost
  useEffect(() => {
    const channel = channelRef.current;
    if (channel && isHost) {
        // Add listener if user is host
        channel.on('broadcast', { event: 'player_action' }, handlePlayerAction);

        return () => {
            // Important: remove the specific listener on cleanup to prevent leaks
            channel.off('broadcast', { event: 'player_action' });
        };
    }
  }, [isHost, handlePlayerAction]);

  const sendPlayerAction = useCallback(async (action: { type: string; payload?: any }) => {
    const currentIsHost = isHostRef.current;
    const currentGameState = gameStateRef.current;

    if (!currentGameState.roomId) return;
    
    if (currentIsHost) {
      // Host executes the action directly
      await handlePlayerAction({ payload: action });
    } else {
      // Other players broadcast the action to the host
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'player_action',
        payload: action,
      });
    }
  }, [handlePlayerAction]); // Depends on the stable handlePlayerAction

  return (
    <GameContext.Provider value={{ gameState, isHost, sendPlayerAction, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};
