"use client";
import React from "react";
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
        className="flex items-center justify-center px-3 py-1 rounded-full text-white text-sm font-medium border border-[#480559] hover:bg-[#480559]/30 transition-all"
        style={{ minWidth: "90px" }}
      >
        {isMuted ? "Activer micro" : "Couper micro"}
      </button>

      {/* 💬 Message texte */}
      <button
        disabled
        className="flex items-center justify-center px-3 py-1 rounded-full text-white text-sm font-medium border border-[#480559] opacity-70"
        style={{ minWidth: "90px" }}
      >
        Saisie texte
      </button>

      {/* 🔴 Interrompre */}
      {isVoiceChatActive && (
        <button
          onClick={handleEndChat}
          className="px-4 py-1 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
          style={{ minWidth: "110px" }}
        >
          Interrompre
        </button>
      )}
    </div>
  );
};
