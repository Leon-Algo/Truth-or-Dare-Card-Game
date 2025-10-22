
import React, { useState, useContext } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import JoinRoomModal from '../components/JoinRoomModal';
import { GameContext, gameService } from '../context/GameContext';

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { dispatch } = useContext(GameContext);

  const handleCreateRoom = () => {
    const newRoom = gameService.createRoom();
    dispatch({ type: 'CREATE_ROOM', payload: { roomId: newRoom.roomId!, hostId: newRoom.hostId! } });
  };
  
  const handleJoinRoom = (roomId: string) => {
    const room = gameService.joinRoom(roomId);
    if (room) {
      dispatch({ type: 'JOIN_ROOM', payload: room });
      setIsModalOpen(false);
    } else {
      // In a real app, the modal would show this error.
      alert("Room not found!");
    }
  };

  return (
    <Card className="text-center">
      <h1 className="text-4xl font-extrabold text-dark mb-2">真心话牌局</h1>
      <p className="text-secondary mb-10">匿名 & 刺激的线下社交游戏</p>
      
      <div className="space-y-4">
        <Button onClick={handleCreateRoom}>创建真心话房间</Button>
        <Button variant="link" onClick={() => setIsModalOpen(true)}>
          或输入房间号加入
        </Button>
      </div>

      <JoinRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJoin={handleJoinRoom}
      />
    </Card>
  );
};

export default HomePage;
