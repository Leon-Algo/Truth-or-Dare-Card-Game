import React, { useContext } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { GameContext, gameService } from '../context/GameContext';
import { PartyPopper } from 'lucide-react';

const EndPage: React.FC = () => {
  const { gameState, dispatch } = useContext(GameContext);

  const handleReturnHome = async () => {
    if (gameState.roomId) {
      await gameService.leaveRoom(gameState.roomId);
    }
    await gameService.leaveGame();
    dispatch({ type: 'LEAVE_GAME' });
  };
  
  // "再来一局" would be more complex, requiring resetting the room state on the backend.
  // For simplicity, we just send the user back to the home screen.

  return (
    <Card className="text-center">
      <div className="flex justify-center mb-4">
          <PartyPopper size={48} className="text-brand-primary"/>
      </div>
      <h1 className="text-3xl font-bold text-dark mb-2">游戏结束!</h1>
      <p className="text-secondary mb-8">
        本局共进行了 {gameState.usedQuestions.length} 轮。
      </p>
      <div className="space-y-4">
        <Button onClick={handleReturnHome}>返回首页</Button>
        {/* <Button variant="secondary">再来一局</Button> */}
      </div>
    </Card>
  );
};

export default EndPage;