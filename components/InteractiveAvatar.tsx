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
import { AvatarControls } from "./AvatarSession/AvatarControls";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId: "ff7e415d125e41a3bfbf0665877075d4", // ✅ corrigé et fixé
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
    <div className="flex items-center justify-center w-full h-screen bg-black overflow-hidden">
      <div
        className="flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-[#480559]/60"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "rgba(0, 0, 0, 0.4)", // fond transparent comme ton formulaire
        }}
      >
        {/* Cadre vidéo / aperçu */}
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
                  border: "1px solid #480559",
                }}
              />
              <div className="mt-4 w-full flex items-center justify-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 text-sm text-white rounded-full bg-neutral-800 border border-neutral-700"
                  style={{
                    width: "120px",
                    appearance: "none",
                    backgroundPosition: "calc(100% - 14px) center",
                    backgroundRepeat: "no-repeat",
                    backgroundImage:
                      "url(\"data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'><path d='M7 10l5 5 5-5z'/></svg>\")",
                    backgroundSize: "16px 16px",
                    paddingRight: "30px",
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
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-[#480559] hover:bg-[#5b0a7e] transition-all"
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barre de contrôle active */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <AvatarControls />
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
