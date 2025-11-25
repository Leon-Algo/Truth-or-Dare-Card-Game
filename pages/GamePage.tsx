
import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, HelpCircle } from 'lucide-react';

interface QuestionCardProps { 
    question: string | null; 
    onNext: () => void; 
    hasQuestions: boolean; 
    totalLeft: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onNext, hasQuestions, totalLeft }) => {
    // STATE LOGIC:
    // isShowingQuestion = true  -> We are looking at the TEXT (Front)
    // isShowingQuestion = false -> We are looking at the PATTERN (Back)
    
    // Initial state: If we have a question, show it. Otherwise show pattern.
    const [isShowingQuestion, setIsShowingQuestion] = useState(!!question);
    const [isAnimating, setIsAnimating] = useState(false);

    // Effect: When server sends a new question, reveal it automatically
    useEffect(() => {
        if (question) {
            // Slight delay to allow the "draw" animation to feel processed
            const timer = setTimeout(() => {
                setIsShowingQuestion(true); // Flip to show question
                setIsAnimating(false);      // Unlock clicks
            }, 200);
            return () => clearTimeout(timer);
        } else {
            // No question (maybe reset or end), show pattern
            setIsShowingQuestion(false);
        }
    }, [question]);

    const handleCardClick = () => {
        if (!hasQuestions || isAnimating) return;
        
        setIsAnimating(true);
        
        if (isShowingQuestion) {
            // 1. Currently reading a question. User wants next.
            // Action: Flip to Pattern FIRST.
            setIsShowingQuestion(false);
            
            // 2. Wait for flip to finish (approx 600ms), THEN ask server for new card
            setTimeout(() => {
                onNext(); 
                // The useEffect above will handle the reveal when data arrives
            }, 600);
        } else {
            // 1. Currently looking at Pattern. User wants to draw.
            // Action: Just ask server.
            onNext();
        }
    };
    
    // CSS 3D TRANSFORM EXPLANATION:
    // Container rotates. 
    // - 0deg: Shows the "Front" of the container. We map the PATTERN to this side.
    // - 180deg: Shows the "Back" of the container. We map the QUESTION to this side.
    // Why? It feels like "opening" the card.
    
    const variants = {
        patternSide: { rotateY: 0, transition: { type: "spring", stiffness: 40, damping: 10 } },
        questionSide: { rotateY: 180, transition: { type: "spring", stiffness: 40, damping: 10 } }
    };

    return (
        <div className="perspective-1000 w-full max-w-sm mx-auto h-96 relative group select-none">
             {/* Dynamic Glow */}
             <div className={`absolute inset-0 bg-brand-primary blur-3xl transition-all duration-700 
                ${isShowingQuestion ? 'opacity-20 scale-105' : 'opacity-10 scale-95'}`}>
             </div>

            <motion.div
                className="relative w-full h-full cursor-pointer preserve-3d"
                initial={false}
                animate={isShowingQuestion ? "questionSide" : "patternSide"}
                variants={variants}
                onClick={handleCardClick}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* --- FACE 1: PATTERN (Visible at 0deg) --- */}
                {/* We treat this as the 'front' of the DOM element, but conceptually the 'back' of a playing card */}
                <div 
                    className="absolute inset-0 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 backface-hidden overflow-hidden border-4 border-white/10"
                    style={{ 
                        background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #8B5CF6 100%)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                     {/* Decorative pattern overlay */}
                    <div className="absolute inset-0 opacity-20" 
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                    </div>

                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/30">
                        {isAnimating ? (
                            <RefreshCw className="text-white/80 animate-spin" size={40} />
                        ) : (
                            <HelpCircle className="text-white/80" size={48} />
                        )}
                    </div>
                    
                    <h2 className="text-3xl font-black text-white tracking-widest relative z-10 drop-shadow-md">
                        {hasQuestions ? (isAnimating ? 'DRAWING...' : 'TAP TO DRAW') : 'EMPTY'}
                    </h2>
                    
                    <div className="absolute bottom-8 px-5 py-2 bg-black/30 rounded-full text-white/90 text-sm font-bold backdrop-blur-md border border-white/10">
                        {totalLeft} CARDS LEFT
                    </div>
                </div>

                {/* --- FACE 2: QUESTION (Visible at 180deg) --- */}
                {/* Pre-rotated 180deg so it matches the container when the container is flipped 180deg */}
                <div 
                    className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden border border-gray-100"
                    style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary"></div>
                    
                    <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-6 text-brand-primary rotate-3">
                        <Sparkles size={28} />
                    </div>
                    
                    <div className="flex-grow flex items-center justify-center w-full">
                        <p className="text-2xl md:text-3xl text-center font-extrabold text-brand-dark leading-tight">
                            {question || "..."}
                        </p>
                    </div>
                    
                    <div className="w-full pt-6 border-t border-gray-100 mt-4">
                        <p className="text-center text-xs text-brand-primary/60 font-bold uppercase tracking-widest">
                            Tap to Flip & Draw
                        </p>
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
    
    const remainingCount = gameState.questions.length;

    return (
        <div className="w-full flex flex-col items-center max-w-md mx-auto">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center"
            >
                <span className="px-4 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-brand-primary/30">
                    Game In Progress
                </span>
            </motion.div>
            
            <QuestionCard 
                question={gameState.currentQuestion}
                onNext={handleDraw}
                hasQuestions={remainingCount > 0 || !!gameState.currentQuestion}
                totalLeft={remainingCount}
            />
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center"
            >
                <p className="text-sm font-medium text-gray-400">
                    Round {gameState.usedQuestions.length + (gameState.currentQuestion ? 1 : 0)}
                </p>
            </motion.div>
        </div>
    );
};

export default GamePage;
