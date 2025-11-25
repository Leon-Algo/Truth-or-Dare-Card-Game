
import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

interface QuestionCardProps { 
    question: string | null; 
    onNext: () => void; 
    hasQuestions: boolean; 
    totalLeft: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onNext, hasQuestions, totalLeft }) => {
    // isFlipped = true means showing BACK of card. false means showing FRONT (Question).
    // Initial state: If there is a question, show front. If not, show back.
    const [isFlipped, setIsFlipped] = useState(!question);
    const [isAnimating, setIsAnimating] = useState(false);

    // Watch for question changes from the server. 
    // If the question changes, it means a draw happened. We should flip to show it.
    useEffect(() => {
        if (question) {
            // New question arrived. 
            // If we are already showing the front (isFlipped=false), this might be a subtle transition.
            // But usually, we are "waiting" (isFlipped=true) when the new question arrives.
            setIsFlipped(false);
            setIsAnimating(false);
        } else {
            // No question active (start of game or reset). Show back.
            setIsFlipped(true);
        }
    }, [question]);

    const handleCardClick = () => {
        if (!hasQuestions || isAnimating) return;
        
        // Interaction Logic:
        // 1. If currently showing Front (Question), click means "Next".
        //    Action: Flip to Back -> Trigger API Draw.
        // 2. If currently showing Back, click means "Draw" (if we aren't already waiting).
        //    Action: Trigger API Draw.
        
        setIsAnimating(true);
        
        if (!isFlipped) {
            // Currently showing question. Flip over first.
            setIsFlipped(true);
            // Wait for flip animation to finish (approx 500ms) before asking server
            setTimeout(() => {
                onNext();
            }, 600);
        } else {
            // Currently showing back. Just draw.
            onNext();
        }
    };
    
    const cardVariants = {
        front: { rotateY: 0, transition: { type: "spring", stiffness: 50, damping: 12 } },
        back: { rotateY: 180, transition: { type: "spring", stiffness: 50, damping: 12 } },
    };

    return (
        <div className="perspective-1000 w-full max-w-sm mx-auto h-80 relative group">
             {/* Glow effect behind card */}
             <div className={`absolute inset-0 bg-brand-primary blur-3xl opacity-20 transition-opacity duration-500 ${isFlipped ? 'scale-90' : 'scale-105'}`}></div>

            <motion.div
                className="relative w-full h-full cursor-pointer preserve-3d"
                initial={false}
                animate={isFlipped ? "back" : "front"}
                variants={cardVariants}
                onClick={handleCardClick}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* --- Card FRONT (The Question) --- */}
                {/* Note: In CSS rotateY(0) is front. */}
                <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden border-2 border-gray-100">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Sparkles className="text-brand-primary" size={24} />
                    </div>
                    <p className="text-xl md:text-2xl text-center font-bold text-dark leading-relaxed">
                        {question || "..."}
                    </p>
                    <p className="absolute bottom-6 text-xs text-gray-400 font-medium">点击抽取下一题</p>
                </div>

                {/* --- Card BACK (The Deck Pattern) --- */}
                {/* Note: rotateY(180) makes this visible when flipped. */}
                <div 
                    className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 backface-hidden overflow-hidden"
                    style={{ 
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
                    }}
                >
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', 
                        backgroundSize: '20px 20px' 
                    }}></div>
                    
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                        {isAnimating ? (
                            <RefreshCw className="text-white animate-spin" size={32} />
                        ) : (
                            <span className="text-3xl font-black text-white">?</span>
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white tracking-widest relative z-10">
                        {hasQuestions ? (isAnimating ? '洗牌中...' : '点击抽卡') : '游戏结束'}
                    </h2>
                    
                    <div className="absolute bottom-6 px-4 py-1 bg-black/20 rounded-full text-white/80 text-xs font-medium backdrop-blur-md border border-white/10">
                        剩余 {totalLeft} 题
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const GamePage: React.FC = () => {
    const { gameState, sendPlayerAction } = useContext(GameContext);

    const handleDraw = () => {
        sendPlayerAction({ type: 'DRAW_QUESTION' });
    };
    
    // total questions available to be drawn
    const remainingCount = gameState.questions.length;

    return (
        <div className="w-full flex flex-col items-center">
            <div className="mb-8 text-center">
                <span className="px-3 py-1 bg-brand-light/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
                    Game In Progress
                </span>
            </div>
            
            <QuestionCard 
                question={gameState.currentQuestion}
                onNext={handleDraw}
                hasQuestions={remainingCount > 0 || !!gameState.currentQuestion}
                totalLeft={remainingCount}
            />
            
            <div className="mt-12 text-center text-gray-400 text-sm">
                <p>{gameState.usedQuestions.length} 轮已过</p>
            </div>
        </div>
    );
};

export default GamePage;
