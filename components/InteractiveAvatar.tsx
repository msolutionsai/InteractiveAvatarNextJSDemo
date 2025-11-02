"use client";

import {
  AvatarQuality,
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

// Configuration stable
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId:
    process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID ||
    "ff7e415d125e41a3bfbf0665877705d4",
  voice: {
    rate: 1.1,
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

  const [config] = useState(DEFAULT_CONFIG);
  const [selectedLanguage, setSelectedLanguage] = useState("fr");
  const [showTextBox, setShowTextBox] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopChromaRef = useRef<(() => void) | null>(null);

  // === Auth ===
  const fetchAccessToken = async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/get-access-token", { method: "POST", cache: "no-store" });
      const data = await res.json();
      return data?.token || null;
    } catch (e) {
      console.error("❌ Erreur récupération token:", e);
      return null;
    }
  };

  // === Nouveau flux stable (sans stream_ready)
  const startSession = useMemoizedFn(async () => {
    setIsLoading(true);
    try {
      const token = await fetchAccessToken();
      if (!token) throw new Error("Token manquant");

      const avatar = initAvatar(token);
      console.log("✅ Avatar initialisé");
      await startAvatar({ ...config, language: selectedLanguage });
      console.log("🎬 Avatar démarré");
      await startVoiceChat();
    } catch (err) {
      console.error("Erreur startSession:", err);
    } finally {
      setIsLoading(false);
    }
  });

  useUnmount(() => {
    stopAvatar();
    if (stopChromaRef.current) stopChromaRef.current();
  });

  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current!;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          video.play().catch(() => {});
          if (stopChromaRef.current) stopChromaRef.current();
          stopChromaRef.current = setupChromaKey(video, canvas);
        }
      };
    }
  }, [stream]);

  const sendText = useMemoizedFn(async () => {
    const msg = textValue.trim();
    if (!msg) return;
    const ref: any = avatarRef.current;
    if (!ref) return console.warn("⚠️ Avatar non prêt");
    if (ref.sendText) await ref.sendText(msg);
    else if (ref.sendTextMessage) await ref.sendTextMessage(msg);
    else if (ref.inputText) await ref.inputText(msg);
    else if (ref.sendMessage) await ref.sendMessage({ type: "text", text: msg });
    setTextValue("");
  });

  return (
    <div id="embed-root" style={{ width: "100%", maxWidth: 480, aspectRatio: "3 / 4", margin: "0 auto" }}>
      <div
        className="flex flex-col items-center justify-start rounded-xl overflow-hidden shadow-xl"
        style={{ width: "100%", background: "rgba(0,0,0,0.9)", border: "1px solid #6d2a8f" }}
      >
        <div style={{ width: "100%", minHeight: 320, background: "black", display: "flex", justifyContent: "center" }}>
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <>
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            </>
          ) : isLoading ? (
            <LoadingIcon />
          ) : (
            <img src="/katya_preview.jpg" alt="Aperçu avatar" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-2 p-2 w-full" style={{ background: "rgba(0,0,0,0.9)" }}>
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => (isVoiceChatActive ? stopVoiceChat() : startVoiceChat())}
                  className="text-white text-xs px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid #6d2a8f" }}
                >
                  {isVoiceChatActive ? "Couper micro" : "Micro"}
                </Button>

                <Button
                  onClick={() => setShowTextBox((v) => !v)}
                  className="text-white text-xs px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid #6d2a8f" }}
                >
                  Texte
                </Button>

                <Button
                  onClick={stopAvatar}
                  className="text-white text-xs px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid #ff4444" }}
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
                    className="flex-1 px-2 py-1 text-xs rounded-md bg-black border border-neutral-700 text-white"
                  />
                  <Button
                    onClick={sendText}
                    className="text-white text-xs font-medium px-3 py-1.5 rounded-md"
                    style={{ backgroundColor: "#6d2a8f" }}
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-1.5 text-xs text-white rounded-full bg-neutral-800 border border-neutral-700"
                style={{ width: 150 }}
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 Anglais</option>
              </select>
              <button
                onClick={startSession}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-full"
                style={{ backgroundColor: isLoading ? "#444" : "#6d2a8f" }}
              >
                {isLoading ? "Chargement…" : "Lancer"}
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
    <StreamingAvatarProvider basePath="https://api.heygen.com">
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
