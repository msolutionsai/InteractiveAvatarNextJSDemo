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
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId:
    process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID ||
    "ff7e415d125e41a3bfbf0665877075d4",
  backgroundType: "transparent", // ✅ fond transparent Heygen
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
    return await response.text();
  }

  const startSession = useMemoizedFn(async () => {
    try {
      const token = await fetchAccessToken();
      const avatar = initAvatar(token);

      avatar.on(StreamingEvents.STREAM_READY, () =>
        console.log("Avatar stream ready with transparent background.")
      );

      await startAvatar({ ...config, language: selectedLanguage });
      await startVoiceChat();
    } catch (err) {
      console.error("Error starting avatar session:", err);
    }
  });

  const endSession = useMemoizedFn(async () => {
    try {
      await stopVoiceChat();
      await stopAvatar();
    } catch (err) {
      console.error("Error stopping avatar:", err);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaRef.current) {
      mediaRef.current.srcObject = stream;
      mediaRef.current.onloadedmetadata = () => mediaRef.current!.play();
    }
  }, [stream]);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-black">
      <div
        className="relative flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "520px",
          border: "1px solid #480559",
          backgroundColor: "rgba(0,0,0,0.8)",
        }}
      >
        {/* Vidéo avec fond transparent */}
        {sessionState === StreamingAvatarSessionState.CONNECTED ? (
          <video
            ref={mediaRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              backgroundColor: "transparent",
              zIndex: 1,
            }}
          />
        ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
          <div className="flex items-center justify-center w-full h-full z-10">
            <LoadingIcon />
          </div>
        ) : (
          // Image d’attente
          <img
            src="/katya_preview.jpg"
            alt="Aperçu avatar"
            className="absolute inset-0 w-full h-full object-contain z-10"
          />
        )}

        {/* Barre de boutons en bas */}
        {sessionState !== StreamingAvatarSessionState.CONNECTED ? (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4 z-20">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 text-sm text-white rounded-full bg-neutral-900 border border-neutral-700 w-[120px]"
              style={{
                appearance: "none",
                backgroundPosition: "calc(100% - 18px) center",
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
              className="px-5 py-2 text-sm font-semibold text-white rounded-full transition-all hover:scale-105"
              style={{
                backgroundColor: "#480559",
                boxShadow: "0 2px 8px rgba(72, 5, 89, 0.5)",
              }}
            >
              Lancer le chat
            </button>
          </div>
        ) : (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4 z-20">
            <button
              onClick={endSession}
              className="px-5 py-2 text-sm font-semibold text-white rounded-full"
              style={{
                backgroundColor: "#dc2626",
                border: "1px solid #480559",
              }}
            >
              Fin
            </button>
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
