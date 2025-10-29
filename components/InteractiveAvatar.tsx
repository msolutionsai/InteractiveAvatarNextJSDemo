"use client";

import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { AvatarControls } from "./AvatarSession/AvatarControls";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
} from "./logic";
import { LoadingIcon } from "./Icons";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId:
    process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID ||
    "ff7e415d125e41a3bfbf0665877075d4", // ✅ ta knowledge base perso
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_multilingual_v2,
  },
  language: "fr",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: { provider: STTProvider.DEEPGRAM },
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat, stopVoiceChat, isVoiceChatActive } = useVoiceChat();

  const [config] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const [selectedLanguage, setSelectedLanguage] = useState("fr");
  const mediaRef = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    const response = await fetch("/api/get-access-token", { method: "POST" });
    const token = await response.text();
    return token;
  }

  const startSession = useMemoizedFn(async () => {
    try {
      const token = await fetchAccessToken();
      const avatar = initAvatar(token);

      avatar.on(StreamingEvents.STREAM_READY, () => {
        console.log("🎬 Stream ready");
      });

      await startAvatar({ ...config, language: selectedLanguage });
      await startVoiceChat();
    } catch (err) {
      console.error("Error starting avatar session:", err);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaRef.current) {
      mediaRef.current.srcObject = stream;
      mediaRef.current.onloadedmetadata = () => {
        mediaRef.current!.play();
      };
    }
  }, [stream]);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-transparent overflow-hidden">
      <div
        className="flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-[#480559]"
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "rgba(0, 0, 0, 0.6)", // fond noir transparent
        }}
      >
        {/* 🎥 Zone vidéo / prévisualisation */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: "100%", height: "420px" }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarVideo ref={mediaRef} />
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center">
              <LoadingIcon />
            </div>
          ) : (
            // 🟣 Écran d’accueil
            <div className="flex flex-col w-full h-full items-center justify-end p-4">
              <img
                src="/avatar-preview.png"
                alt="Aperçu avatar"
                style={{
                  borderRadius: "10px",
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                }}
              />

              <div className="mt-4 w-full flex items-center justify-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm text-white rounded-full bg-neutral-900 border border-[#480559] appearance-none pr-6"
                  style={{
                    maxWidth: "160px",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "calc(100% - 10px) center",
                    backgroundSize: "14px",
                  }}
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="it">🇮🇹 Italien</option>
                </select>

                <button
                  onClick={startSession}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full border border-[#480559] bg-[#480559]/30 hover:bg-[#480559]/50 transition-all"
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🎛️ Barre de commandes */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div className="flex w-full items-center justify-center gap-3 p-3 bg-black/40 border-t border-[#480559]">
            <AvatarControls />
            {isVoiceChatActive && (
              <button
                onClick={stopVoiceChat}
                className="px-4 py-2 text-sm font-semibold text-white rounded-full border border-[#480559] bg-[#480559]/30 hover:bg-[#480559]/50 transition-all"
              >
                Fin
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
