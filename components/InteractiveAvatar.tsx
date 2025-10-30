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

// ✅ Configuration stable
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

  // === Auth ===
  const fetchAccessToken = async () => {
    try {
      const response = await fetch("/api/get-access-token", { method: "POST" });
      const token = await response.text();
      console.log("🔑 Token Heygen reçu:", token ? "✅" : "❌ vide");
      return token;
    } catch (e) {
      console.error("❌ Erreur récupération token:", e);
      return "";
    }
  };

  // === Démarrage session stable (avec gestion correcte des événements)
  const startSession = useMemoizedFn(async () => {
    try {
      setIsLoading(true);
      console.log("🚀 Démarrage de la session avatar...");

      const token = await fetchAccessToken();
      if (!token) {
        console.error("❌ Aucun token reçu, arrêt du lancement.");
        setIsLoading(false);
        return;
      }

      const avatar = initAvatar(token);
      console.log("✅ Avatar initialisé, attente du flux...");

      let hasStarted = false; // ✅ garde anti double appel

      avatar.on("stream_ready", async () => {
        if (hasStarted) return;
        hasStarted = true;
        console.log("📡 Flux prêt → démarrage avatar");
        await startAvatar({ ...config, language: selectedLanguage });
      });

      avatar.on("avatar_started", async () => {
        console.log("✅ Avatar démarré → activation VoiceChat");
        await startVoiceChat();
        setIsLoading(false);
      });

      avatar.on("transcript", (t: any) => console.log("🎙️ Transcription:", t));
      avatar.on("agent_response", (r: any) => console.log("🤖 Réponse agent:", r));
      avatar.on("error", (err: any) => {
        console.error("⚠️ Erreur Streaming:", err);
        setIsLoading(false);
      });
    } catch (err) {
      console.error("❌ Erreur au démarrage avatar:", err);
      setIsLoading(false);
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
        if (video.videoWidth === 0 || video.videoHeight === 0) return;
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
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "3 / 4", // ✅ 480x640
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
           
