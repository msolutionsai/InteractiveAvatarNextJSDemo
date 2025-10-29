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
import { Button } from "./Button";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId:
    process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID ||
    "ff7e415d125e41a3bfbf0665877705d4",
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_multilingual_v2,
  },
  language: "fr",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: { provider: STTProvider.DEEPGRAM },
  backgroundType: "transparent", // ✅ fond transparent correct
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const {
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
    isVoiceChatLoading,
  } = useVoiceChat();

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
      avatar.on(StreamingEvents.STREAM_READY, () => {});
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
        className="flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "transparent",
          border: "1px solid #480559",
        }}
      >
        {/* Cadre vidéo / aperçu */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: "100%", height: "420px" }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarVideo ref={mediaRef} stream={stream} />
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center">
              <LoadingIcon />
            </div>
          ) : (
            // Écran d’accueil (aperçu + boutons)
            <div className="flex flex-col w-full h-full items-center justify-end p-4">
              <img
                src="/katya_preview.jpg"
                alt="Aperçu avatar"
                style={{
                  borderRadius: "10px",
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                  background: "transparent",
                }}
              />

              <div className="mt-4 w-full flex items-center justify-center gap-2">
                {/* Sélecteur de langue */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm text-white rounded-full bg-neutral-800 border border-neutral-700"
                  style={{ maxWidth: "160px" }}
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="it">🇮🇹 Italien</option>
                </select>

                {/* Bouton Lancer */}
                <button
                  onClick={startSession}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-[#480559] hover:bg-[#5a0771]"
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barre de contrôle (active) */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div className="flex w-full items-center justify-center gap-3 p-3 bg-neutral-900/60">
            {/* ✅ Micro */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#480559",
                border: "1px solid #480559",
              }}
              onClick={async () => {
                if (isVoiceChatActive) {
                  await stopVoiceChat();
                } else {
                  await startVoiceChat();
                }
              }}
            >
              {isVoiceChatActive ? "Couper micro" : "Activer micro"}
            </Button>

            {/* 💬 Chat texte */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#480559",
                border: "1px solid #480559",
              }}
            >
              Saisie texte
            </Button>

            {/* 🔴 Fin */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "red",
                border: "1px solid red",
              }}
              onClick={stopAvatar}
            >
              Fin
            </Button>
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
