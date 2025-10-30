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

// ✅ Configuration principale : stable et compatible SDK 2025
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
    const token = await response.text();
    console.log("🔑 Token Heygen reçu:", token ? "✅" : "❌ vide");
    return token;
  };

  // === Démarrage session ===
  const startSession = useMemoizedFn(async () => {
    try {
      console.log("🚀 Démarrage de la session avatar...");
      const token = await fetchAccessToken();

      if (!token) {
        console.error("❌ Aucun token reçu depuis /api/get-access-token");
        return;
      }

      const avatar = initAvatar(token);

      // ✅ Nouveau SDK : connexion explicite requise
      await avatar.connect();

      // ✅ Gestion des événements SDK récents
      avatar.on("stream_ready", async () => {
        console.log("📡 Stream prêt → démarrage avatar");
        await startAvatar({ ...config, language: selectedLanguage });
        await startVoiceChat();
      });

      avatar.on("error", (err: any) =>
        console.error("⚠️ Erreur Streaming:", err)
      );

      avatar.on("transcript", (t: any) =>
        console.log("🎙️ Transcription:", t)
      );

      avatar.on("agent_response", (r: any) =>
        console.log("🤖 Réponse agent:", r)
      );
    } catch (err) {
      console.error("❌ Erreur au démarrage avatar:", err);
    }
  });

  // === Nettoyage ===
  useUnmount(() => {
    stopAvatar();
    if (stopChromaRef.current) stopChromaRef.current();
  });

  // === Gestion du flux vidéo + Chroma Key ===
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current!;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) return; // ✅ sécurité
        video.play().catch(() => {});
        if (stopChromaRef.current) stopChromaRef.current();
        stopChromaRef.current = setupChromaKey(video, canvas);
      };
    }
  }, [stream]);

  // === Envoi texte vers avatar ===
  const sendText = useMemoizedFn(async () => {
    const msg = textValue.trim();
    if (!msg) return;

    try {
      const ref: any = avatarRef.current;
      if (!ref) return console.warn("⚠️ Avatar non prêt à recevoir du texte");

      console.log("💬 Envoi du texte:", msg);

      if (typeof ref.sendText === "function") await ref.sendText(msg);
      else if (typeof ref.sendTextMessage === "function") await ref.sendTextMessage(msg);
      else if (typeof ref.inputText === "function") await ref.inputText(msg);
      else if (typeof ref.sendMessage === "function")
        await ref.sendMessage({ type: "text", text: msg });
      else if (typeof ref.send === "function")
        await ref.send({ type: "text", text: msg });
      else if (typeof ref.message === "function") await ref.message(msg);
      else console.warn("❌ Aucune méthode compatible trouvée sur avatarRef");

      setTextValue("");
    } catch (e) {
      console.error("Erreur envoi texte:", e);
    }
  });

  // === Interface ===
  return (
    <div
      id="embed-root"
      style={{
        width: 340,
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
          width: "320px",
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
            height: 320,
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
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
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
