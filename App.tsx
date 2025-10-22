
import React, { useContext } from 'react';
import { GameProvider, GameContext } from './context/GameContext';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndPage from './pages/EndPage';

const AppContent: React.FC = () => {
    const { gameState } = useContext(GameContext);

    if (!gameState.roomId || gameState.status === 'ended') {
        if (gameState.status === 'ended') {
            return <EndPage />;
        }
        return <HomePage />;
    }

    if (gameState.status === 'waiting') {
        return <LobbyPage />;
    }

    if (gameState.status === 'playing') {
        return <GamePage />;
    }
    
    return <HomePage />;
};

const App: React.FC = () => {
    return (
        <GameProvider>
            <div className="min-h-screen bg-light text-dark flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto">
                    <AppContent />
                </div>
            </div>
        </GameProvider>
    );
};

export default App;
