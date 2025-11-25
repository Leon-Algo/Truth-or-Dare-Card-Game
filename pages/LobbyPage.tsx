
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { GameContext } from '../context/GameContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { Users, Clipboard, Check, Sparkles, Smile, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LobbyPage: React.FC = () => {
  const { gameState, isHost, sendPlayerAction } = useContext(GameContext);
  const [question, setQuestion] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canStart, setCanStart] = useState(false);

  const minQuestions = 3;
  const currentQuestionsCount = gameState.questions.length;
  const onlineCount = gameState.playerCount;

  // Force recalculation of 'canStart' whenever state changes
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

  const handleCopyRoomId = () => {
    if (gameState.roomId) {
      navigator.clipboard.writeText(gameState.roomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Generate anonymous avatars based on count
  const avatars = useMemo(() => {
      return Array.from({ length: Math.min(onlineCount, 8) }).map((_, i) => i);
  }, [onlineCount]);

  return (
    <Card className="relative overflow-hidden border-t-4 border-brand-primary">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>

      {/* Room Header */}
      <div className="text-center mb-8 relative z-10">
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/5 border border-brand-primary/20 rounded-full text-sm font-semibold text-brand-dark mb-4"
        >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Waiting for players
        </motion.div>
        
        <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Room Code</span>
            <div 
            className="group relative flex items-center justify-center gap-4 text-6xl font-black tracking-widest text-dark cursor-pointer select-none"
            onClick={handleCopyRoomId}
            >
            {gameState.roomId}
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-110">
                {isCopied ? <Check className="text-green-500" size={28}/> : <Clipboard className="text-brand-primary" size={28}/>}
            </div>
            </div>
            <p className="text-xs text-brand-primary/60 font-medium mt-2 group-hover:text-brand-primary transition-colors cursor-pointer" onClick={handleCopyRoomId}>
                {isCopied ? "Copied to clipboard!" : "Click code to copy invite link"}
            </p>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 text-center border border-gray-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-5"><Users size={64}/></div>
              <div className="text-3xl font-black text-dark mb-1">{onlineCount}</div>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider">Players</div>
              {/* Visual Avatar List */}
              <div className="flex justify-center -space-x-2 mt-3">
                  {avatars.map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm">
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

          <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 text-center border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5"><Sparkles size={64}/></div>
              <div className="text-3xl font-black text-dark mb-1">{currentQuestionsCount}</div>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider">Questions</div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-brand-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min((currentQuestionsCount / minQuestions) * 100, 100)}%` }}
                  ></div>
              </div>
          </motion.div>
      </div>

      {/* Input Section */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
            Add a Truth Question
        </label>
        <div className="relative group">
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What is the most embarrassing thing you've done?"
                className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary h-32 resize-none text-dark placeholder-gray-400 transition-all font-medium"
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
                            Submit <ArrowRight size={16} />
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
                        className={`text-lg py-4 shadow-xl ${!canStart ? "opacity-75 grayscale" : "animate-pulse"}`}
                    >
                        {canStart ? 'Start Game' : `Waiting for requirements...`}
                    </Button>
                    {!canStart && (
                        <p className="text-center text-xs text-red-400 mt-3 font-medium">
                            Needs {Math.max(2, 2)} players & {Math.max(minQuestions, 3)} questions
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
                    <p className="text-brand-dark font-medium animate-pulse">Waiting for host to start...</p>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default LobbyPage;
