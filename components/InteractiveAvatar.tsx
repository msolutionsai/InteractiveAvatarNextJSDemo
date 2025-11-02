"use client";

import React, { useEffect, useState } from "react";
import { StreamingAvatarProvider } from "./logic/context";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";

/**
 * 🧠 Composant principal InteractiveAvatar
 * - Gère l’affichage de l’avatar et la logique de session
 * - Inclut la gestion voix / streaming / chroma key
 */

export const InteractiveAvatar: React.FC = () => {
  const {
    avatarRef,
    sessionState,
    stream,
    initAvatar,
    startAvatar,
    stopAvatar,
  } = useStreamingAvatarSession();

  const {
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
    isVoiceChatLoading,
  } = useVoiceChat();

  const [token, setToken] = useState<string | null>(null);

  /** 🎫 Récupère le token Heygen au montage */
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch("/api/get-access-token", {
          method: "POST",
          cache: "no-store",
        });
        const data = await res.json();
        setToken(data.token);
      } catch (err) {
        console.error("❌ Erreur lors de la récupération du token:", err);
      }
    };

    fetchToken();
  }, []);

  /** 🚀 Lance l’avatar dès que le token est dispo */
  useEffect(() => {
    const start = async () => {
      if (!token) return;
      try {
        await startAvatar(
          {
            avatarName: "matilda",
            quality: "high",
            disableIdleTimeout: true,
          },
          token,
        );
      } catch (err) {
        console.error("⚠️ Impossible de démarrer l’avatar:", err);
      }
    };
    start();
  }, [token, startAvatar]);

  /** 💡 Nettoyage à la fermeture */
  useEffect(() => {
    return () => {
      stopVoiceChat();
      stopAvatar();
    };
  }, [stopVoiceChat, stopAvatar]);

  /** 🎥 Attache le flux vidéo au <video> */
  useEffect(() => {
    const video = document.getElementById(
      "avatar-video",
    ) as HTMLVideoElement | null;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-black">
      <video
        id="avatar-video"
        autoPlay
        playsInline
        muted
        className="rounded-xl w-[480px] h-[270px] bg-transparent"
      />
      <div className="mt-6 flex gap-4">
        <button
          onClick={() =>
            isVoiceChatActive ? stopVoiceChat() : startVoiceChat()
          }
          disabled={isVoiceChatLoading}
          className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
        >
          {isVoiceChatActive ? "🔇 Couper le micro" : "🎤 Activer le micro"}
        </button>
        <button
          onClick={() => stopAvatar()}
          className="px-6 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition"
        >
          🛑 Stop Avatar
        </button>
      </div>
    </div>
  );
};

/** ✅ Export par défaut requis par Next.js */
export default InteractiveAvatar;
