"use client";
import React from "react";
import { Mic, MicOff, MessageSquare, Power } from "lucide-react";
import { useVoiceChat } from "../logic/useVoiceChat";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";

export const AvatarControls: React.FC = () => {
  const {
    isMuted,
    muteInputAudio,
    unmuteInputAudio,
    stopVoiceChat,
    isVoiceChatActive,
  } = useVoiceChat();

  const { stopAvatar } = useStreamingAvatarSession();

  const handleEndChat = () => {
    stopVoiceChat();
    stopAvatar();
  };

  return (
    <div
      className="flex items-center justify-center gap-3 w-full px-4 py-2"
      style={{
        background: "rgba(0,0,0,0.7)",
        borderTop: "1px solid #480559",
        borderBottom: "1px solid #480559",
        borderRadius: "0 0 16px 16px",
      }}
    >
      {/* 🎙️ Micro */}
      <button
        onClick={isMuted ? unmuteInputAudio : muteInputAudio}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border border-[#480559] text-white hover:bg-[#480559]/30 transition-all"
        title={isMuted ? 'Activer le micro' : 'Couper le micro'}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* 📄 Texte (champ non fonctionnel pour l’instant) */}
      <button
        className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border border-[#480559] text-white hover:bg-[#480559]/30 transition-all"
        title="Saisir un message"
      >
        <MessageSquare size={18} />
      </button>

      {/* Champ texte (placeholder, non fonctionnel) */}
      <input
        type="text"
        placeholder="Tapez ici..."
        disabled
        className="flex-1 h-9 bg-transparent text-white placeholder-gray-400 text-sm border border-[#480559] rounded-full px-3 outline-none opacity-60"
      />

      {/* 🔴 Interrompre */}
      {isVoiceChatActive && (
        <button
          onClick={handleEndChat}
          className="px-4 py-1 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
        >
          Interrompre
        </button>
      )}
    </div>
  );
};
