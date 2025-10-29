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
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream, avatarRef } =
    useStreamingAvatarSession();
  const { startVoiceChat, stopVoiceChat, isVoiceChatActive } = useVoiceChat();

  const [config] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const [selectedLanguage, setSelectedLanguage] = useState("fr");
  const [showTextBox, setShowTextBox] = useState(false);
  const [textValue, setTextValue] = useState("");
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

  const sendText = useMemoizedFn(async () => {
    const msg = textValue.trim();
    if (!msg) return;
    try {
      const anyRef = (avatarRef.current as any) || {};
      if (typeof anyRef.sendTextMessage === "function") {
        await anyRef.sendTextMessage(msg);
      } else if (typeof anyRef.inputText === "function") {
        await anyRef.inputText(msg);
      } else if (typeof anyRef.send === "function") {
        await anyRef.send({ type: "text", text: msg });
      } else {
        console.warn("Aucune API texte disponible sur ce SDK (UI only).");
      }
      setTextValue("");
    } catch (e) {
      console.error("Erreur envoi texte :", e);
    }
  });

  return (
    <div className="flex items-center justify-center w-full h-screen bg-transparent overflow-hidden">
      <div
        className="flex flex-col items-stretch justify-between rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "rgba(0,0,0,0.85)",
          border: "1px solid #480559",
        }}
      >
        {/* --- Zone principale --- */}
        <div className="relative w-full" style={{ height: 480 }}>
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarVideo ref={mediaRef} stream={stream!} />
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingIcon />
            </div>
          ) : (
            // ✅ Écran d’accueil
            <div className="flex flex-col w-full h-full items-center justify-between p-4">
              <div className="flex-1 flex items-center justify-center w-full">
                <img
                  src="/katya_preview.jpg"
                  alt="Aperçu avatar"
                  className="w-full h-full object-contain rounded-xl"
                  draggable={false}
                  style={{
                    background: "transparent",
                    objectPosition: "center",
                  }}
                />
              </div>

              {/* ✅ Boutons en bas */}
              <div className="w-full flex items-center justify-center gap-2 mt-3">
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-3 pr-7 py-2 text-sm text-white rounded-full bg-neutral-800 border border-neutral-700 appearance-none"
                    style={{ width: 160 }}
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
                  style={{
                    backgroundColor: "#480559",
                    border: "1px solid #480559",
                  }}
                >
                  Lancer le chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- Barre commandes active --- */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div
            className="flex flex-col gap-3 p-3 w-full"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Button
                className="text-white text-sm font-medium px-4 py-2 rounded-full"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #480559",
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
                }}
                onClick={() => setShowTextBox((v) => !v)}
              >
                Saisie texte
              </Button>

              <Button
                className="text-white text-sm font-medium px-4 py-2 rounded-full"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #ff4444",
                }}
                onClick={() => stopAvatar()}
              >
                Fin
              </Button>
            </div>

            {showTextBox && (
              <div className="flex items-center gap-2">
                <input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Écrivez votre message…"
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-black/50 border border-neutral-700 text-white"
                />
                <Button
                  className="text-white text-sm font-medium px-4 py-2 rounded-md"
                  style={{
                    backgroundColor: "#480559",
                    border: "1px solid #480559",
                  }}
                  onClick={sendText}
                >
                  Envoyer
                </Button>
              </div>
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
