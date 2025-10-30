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

import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";
import { Button } from "./Button";
import { setupChromaKey } from "./chromaKey";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopChromaRef = useRef<(() => void) | null>(null);

  // === Auth ===
  const fetchAccessToken = async () => {
    const response = await fetch("/api/get-access-token", { method: "POST" });
    return response.text();
  };

  // === Session ===
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
    if (stopChromaRef.current) stopChromaRef.current();
  });

  // === Video + Chroma ===
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current!;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(() => {});
        if (stopChromaRef.current) stopChromaRef.current();
        stopChromaRef.current = setupChromaKey(video, canvas);
      };
    }
  }, [stream]);

  // === Texte ===
  const sendText = useMemoizedFn(async () => {
    const msg = textValue.trim();
    if (!msg) return;

    try {
      if (isVoiceChatActive) {
        await stopVoiceChat();
        await new Promise((r) => setTimeout(r, 200));
      }

      const ref: any = avatarRef.current;
      if (!ref) return console.warn("⚠️ Avatar non prêt");

      if (typeof ref.sendTextMessage === "function") await ref.sendTextMessage(msg);
      else if (typeof ref.inputText === "function") await ref.inputText(msg);
      else if (typeof ref.sendMessage === "function")
        await ref.sendMessage({ type: "text", text: msg });

      setTextValue("");
    } catch (e) {
      console.error("Erreur envoi texte :", e);
    }
  });

  // === UI ===
  return (
    <div
      id="embed-root"
      style={{
        width: 360,
        height: "auto",
        margin: "0 auto",
        padding: 0,
        background: "transparent",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="flex flex-col items-center justify-start rounded-xl overflow-hidden shadow-xl"
        style={{
          width: "340px",
          border: "1px solid #6d2a8f",
          background: "rgba(0,0,0,0.35)", // ✅ fond noir semi-transparent
          borderRadius: "10px",
        }}
      >
        {/* === Zone vidéo === */}
        <div
          className="relative"
          style={{
            width: "100%",
            height: 380, // ✅ plus petit
            background: "transparent",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ background: "transparent" }}
              />
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            </>
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingIcon />
            </div>
          ) : (
            // Image d’attente
            <img
              src="/katya_preview.jpg"
              alt="Aperçu avatar"
              className="w-full h-full object-cover"
              draggable={false}
              style={{ borderRadius: "0px" }}
            />
          )}
        </div>

        {/* === Barre de commandes collée === */}
        <div
          className="flex flex-col gap-2 p-2 w-full"
          style={{
            background: "rgba(0,0,0,0.45)",
            borderTop: "1px solid #6d2a8f",
          }}
        >
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <Button
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #6d2a8f",
                  }}
                  onClick={() =>
                    isVoiceChatActive ? stopVoiceChat() : startVoiceChat()
                  }
                >
                  {isVoiceChatActive ? "Couper micro" : "Micro"}
                </Button>

                <Button
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #6d2a8f",
                  }}
                  onClick={() => setShowTextBox((v) => !v)}
                >
                  Texte
                </Button>

                <Button
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-full"
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
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="Écrivez…"
                    className="flex-1 px-2 py-1 text-xs rounded-md bg-black/40 border border-neutral-700 text-white"
                  />
                  <Button
                    className="text-white text-xs font-medium px-3 py-1.5 rounded-md"
                    style={{
                      backgroundColor: "#6d2a8f",
                      border: "1px solid #6d2a8f",
                    }}
                    onClick={sendText}
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2">
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-2 pr-6 py-1 text-xs text-white rounded-full bg-neutral-800 border border-neutral-700 appearance-none"
                  style={{ width: 120 }}
                >
                  <option value="fr">🇫🇷 FR</option>
                  <option value="en">🇬🇧 EN</option>
                  <option value="es">🇪🇸 ES</option>
                </select>
                <span
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-300"
                  style={{ fontSize: 9 }}
                >
                  ▼
                </span>
              </div>

              <button
                onClick={() => startSession()}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-full hover:bg-[#5a0771]"
                style={{
                  backgroundColor: "#6d2a8f",
                  border: "1px solid #6d2a8f",
                }}
              >
                Lancer
              </button>
            </div>
          )}
        </div>
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
