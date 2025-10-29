import React, { useState } from "react";
import { useVoiceChat } from "../logic/useVoiceChat";
import { useInterrupt } from "../logic/useInterrupt";

export const AvatarControls: React.FC = () => {
  const { isVoiceChatActive, isVoiceChatLoading, startVoiceChat, stopVoiceChat } =
    useVoiceChat();
  const { interrupt } = useInterrupt();
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  return (
    <div
      className="flex flex-col w-full items-center justify-center gap-3 p-3 rounded-b-xl"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)", // fond transparent
        borderTop: "1px solid #480559", // fine bordure violette
      }}
    >
      {/* Ligne des boutons */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* 🎙️ Micro */}
        <button
          onClick={() =>
            isVoiceChatActive ? stopVoiceChat() : startVoiceChat()
          }
          disabled={isVoiceChatLoading}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white border border-[#480559] bg-[#480559]/60 hover:bg-[#480559]/90 transition-all"
        >
          {isVoiceChatActive ? "🎙️ Couper micro" : "🎤 Activer micro"}
        </button>

        {/* 💬 Saisie texte */}
        <button
          onClick={() => setShowTextInput(!showTextInput)}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white border border-[#480559] bg-[#480559]/60 hover:bg-[#480559]/90 transition-all"
        >
          💬 Saisie texte
        </button>

        {/* 🔴 Fin */}
        <button
          onClick={interrupt}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white border border-[#480559] bg-red-700 hover:bg-red-800 transition-all"
        >
          🔴 Fin
        </button>
      </div>

      {/* Champ de texte optionnel */}
      {showTextInput && (
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Tapez votre message ici..."
          className="mt-2 w-3/4 px-3 py-2 rounded-lg bg-neutral-900/70 text-white text-sm border border-[#480559] focus:outline-none focus:border-[#7c3aed]"
        />
      )}
    </div>
  );
};
