
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
  
  return (
    <Card className="text-center py-12">
      <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
            <PartyPopper size={40} className="text-yellow-500"/>
          </div>
      </div>
      <h1 className="text-3xl font-extrabold text-dark mb-3">游戏结束!</h1>
      <p className="text-secondary mb-10 leading-relaxed">
        所有真心话问题都已回答完毕。<br/>
        感谢大家的参与！
      </p>
      
      <div className="p-4 bg-gray-50 rounded-xl mb-8 border border-gray-100">
         <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">总轮数</div>
         <div className="text-2xl font-black text-brand-dark">{gameState.usedQuestions.length}</div>
      </div>

      <div className="space-y-4">
        <Button onClick={handleReturnHome} className="shadow-lg shadow-brand-primary/20">
            返回首页
        </Button>
      </div>
    </Card>
  );
};

export default EndPage;
