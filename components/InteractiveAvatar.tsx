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
    rate: 1.2,
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

  const fetchAccessToken = async () => {
    const response = await fetch("/api/get-access-token", { method: "POST" });
    return response.text();
  };

  const startSession = useMemoizedFn(async () => {
    try {
      const token = await fetchAccessToken();
      const avatar = initAvatar(token);
      avatar.on(StreamingEvents.STREAM_READY, () => {});
      await startAvatar({ ...config, language: selectedLanguage });
      await startVoiceChat();
    } catch (err) {
      console.error("Erreur démarrage avatar :", err);
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
        {/* Zone vidéo / aperçu */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: "100%", height: "420px" }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            // ✅ Correction : ajout de la prop `stream`
            <AvatarVideo ref={mediaRef} stream={stream!} />
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center">
              <LoadingIcon />
            </div>
          ) : (
            <div className="flex flex-col w-full h-full items-center justify-end p-4">
              <img
                src="/katya_preview.jpg"
                alt="Avatar Preview"
                style={{
                  borderRadius: "10px",
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                  background: "transparent",
                }}
              />

              <div className="mt-4 w-full flex items-center justify-center gap-2">
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-3 pr-7 py-2 text-sm text-white rounded-full bg-neutral-800 border border-neutral-700 appearance-none"
                    style={{ width: "150px" }}
                  >
                    <option value="fr">🇫🇷 Français</option>
                    <option value="en">🇬🇧 Anglais</option>
                    <option value="es">🇪🇸 Espagnol</option>
                    <option value="de">🇩🇪 Allemand</option>
                    <option value="it">🇮🇹 Italien</option>
                  </select>
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300"
                    style={{ fontSize: 10 }}
                  >
                    ▼
                  </span>
                </div>

                <button
                  onClick={() => startSession()}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-[#5a0771]"
                  style={{ backgroundColor: "#480559", border: "1px solid #480559" }}
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div
            className="flex w-full items-center justify-center gap-2 p-3"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #480559",
                color: "#ffffff",
              }}
              onClick={() =>
                isVoiceChatActive ? stopVoiceChat() : startVoiceChat()
              }
            >
              {isVoiceChatActive ? "Couper micro" : "Activer micro"}
            </Button>

            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #480559",
                color: "#ffffff",
              }}
              onClick={() => alert("Zone de saisie texte (démo)")}
            >
              Saisie texte
            </Button>

            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #ff4444",
                color: "#ffffff",
              }}
              onClick={() => stopAvatar()}
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
