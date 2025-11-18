export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface Room {
  roomId: string | null;
  playerCount: number;
  questions: string[];
  usedQuestions: string[];
  status: GameStatus;
  currentQuestion: string | null;
  hostId: string | null;
}

export type GameAction =
  | { type: 'CREATE_ROOM'; payload: { roomId: string; hostId: string } }
  | { type: 'JOIN_ROOM'; payload: Room }
  | { type: 'SET_CLIENT_ID'; payload: { clientId: string } }
  | { type: 'SUBMIT_QUESTION'; payload: string }
  | { type: 'UPDATE_STATE'; payload: Partial<Room> }
  | { type: 'START_GAME' }
  | { type: 'DRAW_QUESTION'; payload: { question: string, remainingQuestions: string[] } }
  | { type: 'END_GAME' }
  | { type: 'LEAVE_GAME' };