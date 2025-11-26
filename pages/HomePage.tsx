
import React, { useState, useContext } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import JoinRoomModal from '../components/JoinRoomModal';
import { GameContext, gameService } from '../context/GameContext';
import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';

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
      alert("无法创建房间，请重试。");
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
           alert("无法加入房间。房间可能已满或已结束。");
        }
      } else {
        alert("找不到该房间！请检查房间号并重试。");
      }
    } catch (error) {
      console.error("Failed to join room", error);
      alert("加入房间时发生错误。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="text-center relative overflow-hidden">
                {/* Decorative Blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>

                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-brand-primary to-brand-light rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                        <Zap className="text-white" size={32} fill="currentColor" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-dark mb-3 tracking-tight">
                    匿名真心话
                    <span className="text-brand-primary">大冒险</span>
                </h1>
                <p className="text-secondary mb-10 text-sm md:text-base px-4 leading-relaxed">
                    在保护隐私的前提下，与朋友们进行一场刺激、真实的内心探索游戏。
                </p>
                
                <div className="space-y-4 max-w-xs mx-auto">
                    <Button onClick={handleCreateRoom} disabled={isLoading} className="shadow-brand-primary/20 shadow-lg">
                        {isLoading ? '创建中...' : '创建新房间'}
                    </Button>
                    <Button variant="link" onClick={() => setIsModalOpen(true)} disabled={isLoading}>
                        加入已有房间
                    </Button>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Sparkles size={12} />
                    <span>完全匿名 · 实时同步 · 简单有趣</span>
                </div>
            </Card>
        </motion.div>

        <JoinRoomModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onJoin={handleJoinRoom}
        />
    </div>
  );
};

export default HomePage;
