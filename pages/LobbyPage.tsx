
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { GameContext, gameService } from '../context/GameContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { Users, Clipboard, Check, Sparkles, Smile, ArrowRight, LogOut, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LobbyPage: React.FC = () => {
  const { gameState, isHost, sendPlayerAction, dispatch } = useContext(GameContext);
  const [question, setQuestion] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canStart, setCanStart] = useState(false);

  const minQuestions = 3;
  const currentQuestionsCount = gameState.questions.length;
  const onlineCount = gameState.playerCount;

  useEffect(() => {
    setCanStart(onlineCount >= 2 && currentQuestionsCount >= minQuestions);
  }, [onlineCount, currentQuestionsCount]);

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

  const handleLeaveRoom = async () => {
    if (confirm("确定要退出房间吗？")) {
        if (gameState.roomId) {
            await gameService.leaveRoom(gameState.roomId);
        }
        await gameService.leaveGame();
        dispatch({ type: 'LEAVE_GAME' });
    }
  };

  const handleCopyRoomId = () => {
    if (gameState.roomId) {
      navigator.clipboard.writeText(gameState.roomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const avatars = useMemo(() => {
      return Array.from({ length: Math.min(onlineCount, 8) }).map((_, i) => i);
  }, [onlineCount]);

  return (
    <Card className="relative overflow-hidden border-t-4 border-brand-primary">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>

      {/* Header: Exit & Status */}
      <div className="flex justify-between items-start mb-6 relative z-10">
          <button 
            onClick={handleLeaveRoom}
            className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-bold"
          >
              <LogOut size={14} />
              退出
          </button>
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-semibold text-green-700"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            等待玩家中
        </motion.div>
      </div>

      {/* Room Code */}
      <div className="text-center mb-8 relative z-10">
        <div className="flex flex-col items-center group">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">房间号</span>
            <div 
            className="relative flex items-center justify-center gap-4 text-6xl font-black tracking-widest text-dark cursor-pointer select-none transition-transform active:scale-95"
            onClick={handleCopyRoomId}
            >
            {gameState.roomId}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                {isCopied ? <Check className="text-green-500" size={24}/> : <Clipboard className="text-brand-primary" size={24}/>}
            </div>
            </div>
            <p className="text-xs text-brand-primary/60 font-medium mt-2 cursor-pointer" onClick={handleCopyRoomId}>
                {isCopied ? "已复制到剪贴板!" : "点击房间号复制"}
            </p>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-5"><Users size={64}/></div>
              <div className="text-3xl font-black text-dark mb-1">{onlineCount}</div>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider">在线玩家</div>
              {/* Visual Avatar List */}
              <div className="flex justify-center -space-x-2 mt-3">
                  {avatars.map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center shadow-sm">
                          <Smile size={14} className="text-gray-400" />
                      </div>
                  ))}
                  {onlineCount > 8 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                          +{onlineCount - 8}
                      </div>
                  )}
              </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5"><Sparkles size={64}/></div>
              <div className="text-3xl font-black text-dark mb-1">{currentQuestionsCount}</div>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider">问题库</div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${currentQuestionsCount >= minQuestions ? 'bg-green-500' : 'bg-brand-primary'}`}
                    style={{ width: `${Math.min((currentQuestionsCount / minQuestions) * 100, 100)}%` }}
                  ></div>
              </div>
          </motion.div>
      </div>

      {/* Input Section */}
      <div className="mb-8">
        <label className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary rounded-lg text-white">
                <MessageSquarePlus size={14} />
            </div>
            添加一个真心话问题
        </label>
        <div className="relative group">
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：你做过最尴尬的事情是什么？"
                className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary h-32 resize-none text-dark placeholder-gray-400 transition-all font-medium text-sm leading-relaxed"
            />
            <div className="absolute bottom-3 right-3">
                 <button 
                    onClick={handleSubmitQuestion} 
                    disabled={!question.trim() || isSubmitting}
                    className="bg-brand-dark text-white p-2.5 rounded-xl hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 font-bold text-sm"
                 >
                     {isSubmitting ? (
                         <Sparkles size={18} className="animate-spin"/>
                     ) : (
                         <>
                            提交 <ArrowRight size={16} />
                         </>
                     )}
                 </button>
            </div>
        </div>
      </div>
      
      {/* Footer / Action */}
      <div className="border-t border-gray-100 pt-6">
        <AnimatePresence mode='wait'>
            {isHost ? (
                <motion.div
                    key="host-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Button 
                        onClick={handleStartGame} 
                        disabled={!canStart} 
                        className={`text-lg py-4 shadow-xl ${!canStart ? "opacity-75 grayscale cursor-not-allowed" : "animate-pulse"}`}
                    >
                        {canStart ? '开始游戏' : `等待满足条件...`}
                    </Button>
                    {!canStart && (
                        <p className="text-center text-xs text-red-400 mt-3 font-medium">
                            需要至少 2 名玩家 & {minQuestions} 个问题
                        </p>
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="guest-message"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                    <p className="text-brand-dark font-medium animate-pulse text-sm">等待房主开始游戏...</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default LobbyPage;
