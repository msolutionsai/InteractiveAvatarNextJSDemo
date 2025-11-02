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

/** ✅ Configuration stable et inchangée */
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
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopChromaRef = useRef<(() => void) | null>(null);

  /** 🎫 Récupération du token Heygen */
  const fetchAccessToken = async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const response = await fetch(`${baseUrl}/api/get-access-token`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json();
      const token = data?.token;
      console.log("🔑 Token Heygen reçu:", token ? "✅" : "❌ vide");
      return token || "";
    } catch (e) {
      console.error("❌ Erreur récupération token:", e);
      return "";
    }
  };

  /** 🚀 Démarrage session avec gestion voix et texte (ordre correct) */
  const startSession = useMemoizedFn(async () => {
    try {
      setIsLoading(true);
      console.log("🚀 Démarrage session avatar...");

      const token = await fetchAccessToken();
      if (!token) throw new Error("Token vide");

      // 1) init
      initAvatar(token);

      // 2) démarrage direct — les events sont gérés dans le hook
      await startAvatar({ ...config, language: selectedLanguage }, token);

      // 3) voice chat (API intégrée)
      await startVoiceChat(false);
    } catch (err) {
      console.error("❌ Erreur startSession:", err);
    } finally {
      setIsLoading(false);
    }
  });

  /** 🧹 Nettoyage */
  useUnmount(() => {
    stopAvatar();
    if (stopChromaRef.current) stopChromaRef.current();
  });

  /** 🎥 Gestion flux vidéo + Chroma Key */
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current!;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) return;
        video.play().catch(() => {});
        if (stopChromaRef.current) stopChromaRef.current();
        stopChromaRef.current = setupChromaKey(video, canvas);
      };
    }
  }, [stream]);

  /** 💬 Envoi texte à l’avatar */
  const sendText = useMemoizedFn(async () => {
  const msg = textValue.trim();
  if (!msg) return;

  try {
    const ref: any = avatarRef.current;
    if (!ref) return console.warn("⚠️ Avatar non prêt à recevoir du texte");

    console.log("💬 Envoi du texte:", msg);

    // ✅ API v2
    if (typeof ref.sendTextMessage === "function") {
      await ref.sendTextMessage({ text: msg });
    } else if (typeof ref.sendText === "function") {
      try { await ref.sendText({ text: msg }); } // certaines builds acceptent l’objet
      catch { await ref.sendText(msg); }         // fallback ancien format string
    } else if (typeof ref.inputText === "function") {
      await ref.inputText(msg);
    } else if (typeof ref.sendMessage === "function") {
      await ref.sendMessage({ type: "input_text", text: msg });
    } else {
      console.warn("❓ Pas d’API d’envoi de texte disponible sur ce SDK.");
    }

    setTextValue("");
  } catch (e) {
    console.error("Erreur envoi texte:", e);
  }
});
  /** 🎨 Interface */
  return (
    <div
      id="embed-root"
      style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "3 / 4",
        margin: "0 auto",
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
          width: "100%",
          border: "1px solid #6d2a8f",
          background: "rgba(0,0,0,0.9)",
          borderRadius: "10px",
        }}
      >
        {/* === Zone vidéo === */}
        <div
          className="relative"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "320px",
            background: "black",
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
                style={{ background: "rgba(0,0,0,0.95)" }}
              />
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            </>
          ) : isLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingIcon />
            </div>
          ) : (
            <img
              src="/katya_preview.jpg"
              alt="Aperçu avatar"
              className="w-full h-full object-cover"
              draggable={false}
              style={{ background: "black" }}
            />
          )}
        </div>

        {/* === Barre de commandes === */}
        <div
          className="flex flex-col gap-2 p-2 w-full"
          style={{
            background: "rgba(0,0,0,0.9)",
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
                    className="flex-1 px-2 py-1 text-xs rounded-md bg-black border border-neutral-700 text-white"
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
                  className="px-3 pr-7 py-1.5 text-xs text-white rounded-full bg-neutral-800 border border-neutral-700 appearance-none"
                  style={{ width: 150 }}
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="it">🇮🇹 Italien</option>
                  <option value="pt">🇵🇹 Portugais</option>
                </select>
                <span
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-300"
                  style={{ fontSize: 9 }}
                >
                  ▼
                </span>
              </div>

              <button
                onClick={startSession}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-full hover:bg-[#5a0771]"
                style={{
                  backgroundColor: isLoading ? "#444" : "#6d2a8f",
                  border: "1px solid #6d2a8f",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? "Chargement…" : "Lancer"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          #embed-root {
            max-width: 90vw;
            aspect-ratio: 3 / 4;
            transition: all 0.4s ease;
          }
        }
      `}</style>
    </div>
  );
}

/** ✅ Export avec Provider conservé */
export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath="https://api.heygen.com">
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
