
import React, { useState, useContext } from 'react';
import { GameContext, gameService } from '../context/GameContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { Users, Clipboard, Check } from 'lucide-react';

const LobbyPage: React.FC = () => {
  const { gameState, dispatch } = useContext(GameContext);
  const [question, setQuestion] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canStart = gameState.playerCount >= 2 && gameState.questions.length >= 3;

  const handleSubmitQuestion = async () => {
    if (question.trim()) {
      setIsSubmitting(true);
      // Optimistic UI update
      dispatch({ type: 'SUBMIT_QUESTION', payload: question.trim() });
      try {
        await gameService.submitQuestion(gameState.roomId!, question.trim());
        setQuestion('');
      } catch (error) {
        console.error("Failed to submit question", error);
        alert("Could not submit your question. Please try again.");
        // Here you might want to roll back the optimistic update
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleStartGame = async () => {
    if (canStart) {
      await gameService.startGame(gameState.roomId!);
    }
  };

  const handleCopyRoomId = () => {
    if (gameState.roomId) {
      navigator.clipboard.writeText(gameState.roomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <p className="text-secondary">房间号</p>
        <div 
          className="flex items-center justify-center gap-2 mt-1 text-4xl font-bold tracking-widest text-brand-primary cursor-pointer"
          onClick={handleCopyRoomId}
        >
          {gameState.roomId}
          {isCopied ? <Check className="text-green-500" size={28}/> : <Clipboard size={28}/>}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-secondary mb-8">
        <Users size={20} />
        <span>已有 {gameState.playerCount} 人加入</span>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="输入一个“真心话”问题..."
        className="w-full p-4 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent mb-4 h-28 resize-none"
      />
      <Button onClick={handleSubmitQuestion} disabled={!question.trim() || isSubmitting}>
        {isSubmitting ? '提交中...' : `提交问题 (${gameState.questions.length})`}
      </Button>
      
      <div className="my-6 border-t border-medium"></div>

      <Button onClick={handleStartGame} disabled={!canStart}>
        开始游戏
      </Button>
      {!canStart && <p className="text-xs text-secondary text-center mt-2">需要至少2位玩家和3个问题才能开始</p>}
    </Card>
  );
};

export default LobbyPage;
