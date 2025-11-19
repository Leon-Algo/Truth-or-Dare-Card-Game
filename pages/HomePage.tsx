import React, { useState, useContext } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import JoinRoomModal from '../components/JoinRoomModal';
import { GameContext, gameService } from '../context/GameContext';

const generateId = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { dispatch } = useContext(GameContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const newRoom = await gameService.createRoom();
      try {
        localStorage.setItem('truth-game-session', JSON.stringify({ roomId: newRoom.roomId, clientId: newRoom.hostId }));
      } catch (e) {
        console.error("localStorage is not available.", e);
      }
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
      const roomExists = await gameService.getRoom(roomId);
      if (roomExists) {
        const room = await gameService.joinRoom(roomId);
        if(room) {
          const clientId = generateId(10);
          try {
            localStorage.setItem('truth-game-session', JSON.stringify({ roomId, clientId }));
          } catch(e) {
            console.error("localStorage is not available.", e);
          }
          dispatch({ type: 'JOIN_ROOM', payload: room! });
          dispatch({ type: 'SET_CLIENT_ID', payload: { clientId } });
          setIsModalOpen(false);
        } else {
           alert("Could not join the room. It might be full or has ended.");
        }
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
      <h1 className="text-4xl font-extrabold text-dark mb-2">真心话大冒险</h1>
      <p className="text-secondary mb-10">匿名 & 刺激的社交游戏</p>
      
      <div className="space-y-4">
        <Button onClick={handleCreateRoom} disabled={isLoading}>
          {isLoading ? '创建中...' : '创建新房间'}
        </Button>
        <Button variant="link" onClick={() => setIsModalOpen(true)} disabled={isLoading}>
          加入房间
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