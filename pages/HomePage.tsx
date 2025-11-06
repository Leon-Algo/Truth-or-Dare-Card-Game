import React, { useState, useContext } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import JoinRoomModal from '../components/JoinRoomModal';
import { GameContext, gameService } from '../context/GameContext';

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { dispatch } = useContext(GameContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const newRoom = await gameService.createRoom();
      localStorage.setItem('truth-game-room', JSON.stringify({ roomId: newRoom.roomId, clientId: newRoom.hostId }));
      dispatch({ type: 'CREATE_ROOM', payload: { roomId: newRoom.roomId!, hostId: newRoom.hostId! } });
    } catch (error) {
      console.error("Failed to create room", error);
      alert("Could not create a room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoinRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      // First, check if the room exists
      const roomExists = await gameService.getRoom(roomId);
      if (roomExists) {
        const room = await gameService.joinRoom(roomId);
        localStorage.setItem('truth-game-room', JSON.stringify({ roomId }));
        dispatch({ type: 'JOIN_ROOM', payload: room! });
        setIsModalOpen(false);
      } else {
        alert("Room not found! Please check the ID and try again.");
      }
    } catch (error) {
      console.error("Failed to join room", error);
      alert("An error occurred while joining the room.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="text-center">
      <h1 className="text-4xl font-extrabold text-dark mb-2">真心话牌局</h1>
      <p className="text-secondary mb-10">匿名 & 刺激的线下社交游戏</p>
      
      <div className="space-y-4">
        <Button onClick={handleCreateRoom} disabled={isLoading}>
          {isLoading ? '创建中...' : '创建真心话房间'}
        </Button>
        <Button variant="link" onClick={() => setIsModalOpen(true)} disabled={isLoading}>
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