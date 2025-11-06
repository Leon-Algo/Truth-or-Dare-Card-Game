
import React, { useState, useContext } from 'react';
import { GameContext, gameService } from '../context/GameContext';
import Card from '../components/Card';
import { motion, AnimatePresence } from 'framer-motion';

const QuestionCard: React.FC<{ question: string | null; onDraw: () => void; hasQuestions: boolean }> = ({ question, onDraw, hasQuestions }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleCardClick = async () => {
        if (!hasQuestions || isFlipped || isDrawing) return;
        setIsDrawing(true);
        setIsFlipped(true);
        await onDraw();
        // The card resets for the next player after a delay
        setTimeout(() => {
            setIsFlipped(false);
            setIsDrawing(false);
        }, 2000);
    };
    
    const cardVariants = {
        initial: { y: 0, scale: 1, rotateY: 0 },
        flipped: { rotateY: 180, transition: { duration: 0.5 } },
    };

    return (
        <div className="perspective-1000">
            <motion.div
                className="relative w-full h-64 cursor-pointer"
                onClick={handleCardClick}
                initial="initial"
                animate={isFlipped ? "flipped" : "initial"}
                variants={cardVariants}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Card Back */}
                <div className="absolute w-full h-full bg-brand-primary rounded-2xl shadow-lg flex items-center justify-center backface-hidden p-4">
                    <h2 className="text-2xl font-bold text-white text-center">
                      {hasQuestions ? (isDrawing ? '...' : '点击抽题') : '没有更多问题了'}
                    </h2>
                </div>

                {/* Card Front */}
                <div className="absolute w-full h-full bg-white rounded-2xl shadow-lg flex items-center justify-center p-6 backface-hidden" style={{ transform: 'rotateY(180deg)'}}>
                    <p className="text-xl text-center font-medium text-dark">{question}</p>
                </div>
            </motion.div>
        </div>
    );
};


const GamePage: React.FC = () => {
    const { gameState } = useContext(GameContext);

    const handleDraw = async () => {
        await gameService.drawQuestion(gameState.roomId!);
    };
    
    const totalQuestions = gameState.questions.length + gameState.usedQuestions.length;

    return (
        <div className="w-full">
            <div className="text-center mb-6">
                <p className="text-secondary">问题池剩余</p>
                <p className="text-2xl font-bold">{gameState.questions.length} / {totalQuestions}</p>
            </div>
            
            <AnimatePresence>
              <QuestionCard 
                  key={gameState.usedQuestions.length}
                  question={gameState.currentQuestion}
                  onDraw={handleDraw}
                  hasQuestions={gameState.questions.length > 0}
              />
            </AnimatePresence>
        </div>
    );
};

export default GamePage;
