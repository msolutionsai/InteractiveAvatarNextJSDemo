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
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId: "ff7e415d125e41a3bfbf0665877075d4", // ✅ Ta base de connaissance
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
  const { startVoiceChat } = useVoiceChat();

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
      console.error("Erreur au démarrage de l'avatar :", err);
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
    <div className="flex items-center justify-center w-full h-screen bg-black overflow-hidden">
      <div
        className="flex flex-col items-center justify-center rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "rgba(0,0,0,0.7)",
          border: "1px solid #480559",
        }}
      >
        {/* Zone vidéo */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: "100%", height: "420px" }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarVideo ref={mediaRef} />
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center h-full">
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
                  background: "transparent",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />

              <div className="mt-4 w-full flex items-center justify-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm text-white rounded-full bg-black/60 border border-[#480559] focus:outline-none"
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="it">🇮🇹 Italien</option>
                </select>

                <button
                  onClick={startSession}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-[#480559] hover:bg-[#5a1a91] transition-all"
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barre FreeVox */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div
            className="flex flex-col items-center justify-center w-full animate-fadeIn"
            style={{
              background: "rgba(0,0,0,0.6)",
              borderTop: "1px solid #480559",
              borderRadius: "0 0 20px 20px",
            }}
          >
            <AvatarControls />
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
