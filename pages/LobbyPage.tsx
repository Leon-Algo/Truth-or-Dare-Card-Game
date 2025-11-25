
import React, { useState, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { Users, Clipboard, Check, MessageSquarePlus, Sparkles } from 'lucide-react';

const LobbyPage: React.FC = () => {
  const { gameState, isHost, sendPlayerAction } = useContext(GameContext);
  const [question, setQuestion] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minQuestions = 3;
  const currentQuestionsCount = gameState.questions.length;
  const canStart = gameState.playerCount >= 2 && currentQuestionsCount >= minQuestions;

  const handleSubmitQuestion = async () => {
    if (question.trim()) {
      setIsSubmitting(true);
      await sendPlayerAction({ type: 'SUBMIT_QUESTION', payload: question.trim() });
      setQuestion('');
      setIsSubmitting(false);
    }
  };

  const handleStartGame = async () => {
    if (canStart && isHost) {
      await sendPlayerAction({ type: 'START_GAME' });
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
    <Card className="relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-brand-light opacity-10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-blue-400 opacity-10 blur-2xl"></div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-secondary mb-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            等待玩家加入...
        </div>
        <div 
          className="group relative flex items-center justify-center gap-3 text-5xl font-black tracking-widest text-brand-primary cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={handleCopyRoomId}
          title="点击复制"
        >
          {gameState.roomId}
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isCopied ? <Check className="text-green-500" size={24}/> : <Clipboard className="text-gray-400" size={24}/>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">点击复制房间号分享给好友</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <div className="flex justify-center text-brand-light mb-1"><Users size={24} /></div>
              <div className="text-2xl font-bold text-dark">{gameState.playerCount}</div>
              <div className="text-xs text-secondary">在线玩家</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <div className="flex justify-center text-brand-light mb-1"><MessageSquarePlus size={24} /></div>
              <div className="text-2xl font-bold text-dark">{currentQuestionsCount}</div>
              <div className="text-xs text-secondary">已提交问题</div>
          </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-dark mb-2 ml-1">贡献一个真心话问题</label>
        <div className="relative">
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：你最后悔的一件事是什么？"
                className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent h-28 resize-none shadow-sm text-dark placeholder-gray-300 transition-all"
            />
            <div className="absolute bottom-3 right-3">
                 <button 
                    onClick={handleSubmitQuestion} 
                    disabled={!question.trim() || isSubmitting}
                    className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                 >
                     {isSubmitting ? <Sparkles size={18} className="animate-spin"/> : <Check size={18}/>}
                 </button>
            </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">每位玩家建议至少提交 1-2 个问题</p>
      </div>
      
      <div className="border-t border-gray-100 pt-6">
        <Button onClick={handleStartGame} disabled={!canStart || !isHost} className={!isHost ? "opacity-75" : ""}>
            {isHost ? (
                canStart ? '开始游戏' : `还需 ${Math.max(0, 2 - gameState.playerCount)} 人 或 ${Math.max(0, minQuestions - currentQuestionsCount)} 个问题`
            ) : (
                '等待房主开始'
            )}
        </Button>
      </div>
    </Card>
  );
};

export default LobbyPage;
