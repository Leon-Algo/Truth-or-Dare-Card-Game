
import React, { useState } from 'react';
import Button from './Button';
import { X } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleJoin = () => {
    if (roomId.length !== 4) {
      setError('房间号必须是4位字符。');
      return;
    }
    setError('');
    onJoin(roomId.toUpperCase());
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(val.length <= 4) {
      setRoomId(val);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative transform transition-all duration-300 scale-100 border border-gray-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-dark">加入房间</h2>
        <p className="text-center text-secondary mb-6 text-sm">请输入 4 位房间号以加入游戏</p>
        
        <input
          type="text"
          value={roomId}
          onChange={handleInputChange}
          maxLength={4}
          className="w-full p-4 text-center text-3xl font-black tracking-[0.5em] bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-base placeholder:text-gray-300"
          placeholder="____"
        />
        
        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        
        <div className="mt-6">
          <Button onClick={handleJoin} disabled={roomId.length !== 4}>
            立即加入
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomModal;
