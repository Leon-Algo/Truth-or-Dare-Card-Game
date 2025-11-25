
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
        clientId: action.payload.hostId,
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
      // We rely on the server update now, so this is just for local immediate feedback if needed, 
      // but strictly we should wait for UPDATE_STATE. Kept for optimistic UI if desired.
      return state; 
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
        return { ...initialState, clientId: state.clientId };
    default:
      return state;
  }
};

export const GameContext = createContext<{
  gameState: LocalGameState;
  isHost: boolean;
  sendPlayerAction: (action: { type: string; payload?: any }) => Promise<void>;
  dispatch: React.Dispatch<GameAction>;
}>({
  gameState: initialState,
  isHost: false,
  sendPlayerAction: async () => {},
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

const handleSupabaseError = (error: any) => {
    if (error.code === '42P01') {
        console.error("CRITICAL: Database tables not found.");
        alert("严重错误：数据库未初始化。\n\n请登录 Supabase 后台 SQL Editor 运行建表脚本！");
    }
    throw error;
}

export const gameService = {
    createRoom: async (): Promise<Room> => {
        let newRoomId = '';
        let roomExists = true;
        while (roomExists) {
            newRoomId = generateId(4);
            const { data, error } = await supabase.from('rooms').select('room_id').eq('room_id', newRoomId).maybeSingle();
            
            if (error) handleSupabaseError(error);
            if (!data) roomExists = false;
        }
        
        const hostId = generateId(10);
        const newRoomData: Omit<LocalGameState, 'clientId'> = {
            ...initialState,
            roomId: newRoomId,
            hostId: hostId,
        };

        const { error } = await supabase.from('rooms').insert({ room_id: newRoomId, state: newRoomData });
        if (error) handleSupabaseError(error);

        return newRoomData as Room;
    },
    getRoom: async (roomId: string): Promise<Room | null> => {
        const { data, error } = await supabase.from('rooms').select('state').eq('room_id', roomId).single();
        if (error) {
             if (error.code === 'PGRST116') return null;
             handleSupabaseError(error);
             return null;
        }
        return data.state as Room;
    },
    joinRoom: async (roomId: string): Promise<Room | null> => {
        const { data, error } = await supabase.rpc('join_room', { p_room_id: roomId });
        if (error) handleSupabaseError(error);
        return data as Room;
    },
    leaveRoom: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
        if (error) console.error("Failed to leave room:", error);
    },
    submitQuestion: async (roomId: string, question: string): Promise<void> => {
        const { error } = await supabase.rpc('submit_question', { p_room_id: roomId, p_question: question });
        if (error) handleSupabaseError(error);
    },
    startGame: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('start_game', { p_room_id: roomId });
        if (error) handleSupabaseError(error);
    },
    drawQuestion: async (roomId: string): Promise<void> => {
        const { error } = await supabase.rpc('draw_question', { p_room_id: roomId });
        if (error) handleSupabaseError(error);
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
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Session recovery
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
        }
    };
    rejoinSession();
  }, []);

  // Direct Action Handler - Everyone calls the API directly
  const sendPlayerAction = useCallback(async (action: { type: string; payload?: any }) => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.roomId) return;
    
    try {
        switch (action.type) {
          case 'SUBMIT_QUESTION':
            await gameService.submitQuestion(currentGameState.roomId, action.payload);
            break;
          case 'START_GAME':
            await gameService.startGame(currentGameState.roomId);
            break;
          case 'DRAW_QUESTION':
            await gameService.drawQuestion(currentGameState.roomId);
            break;
        }
    } catch (e) {
        console.error("Action failed:", e);
        alert("Action failed. Please check your connection.");
    }
  }, []);

  // Real-time Subscription - Single Source of Truth
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

    // Listen to ALL updates on the 'rooms' table for this room_id
    channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_id=eq.${gameState.roomId}` },
        (payload) => {
            if (payload.new && payload.new.state) {
                // Determine if we need to transition status
                const newState = payload.new.state as Room;
                dispatch({ type: 'UPDATE_STATE', payload: newState });
            }
        }
    );
    
    channel.subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') console.error('Real-time channel error:', err);
    });

    return () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };
  }, [gameState.roomId]);

  return (
    <GameContext.Provider value={{ gameState, isHost, sendPlayerAction, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};
