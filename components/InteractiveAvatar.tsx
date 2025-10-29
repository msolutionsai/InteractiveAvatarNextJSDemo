"use client";

import React, { useRef, useState } from "react";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";
import { useMessageHistory } from "./logic/useMessageHistory";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
} from "./logic/context";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { Button } from "./Button";
import { Select } from "./Select";
import {
  AvatarQuality,
  VoiceChatTransport,
  VoiceEmotion,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";

export default function InteractiveAvatar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState("fr-FR");
  const [sessionState, setSessionState] = useState(
    StreamingAvatarSessionState.INACTIVE
  );

  const { startAvatar, stopAvatar, stream } = useStreamingAvatarSession();
  const { startVoiceChat, stopVoiceChat, isVoiceChatActive } = useVoiceChat();

  useMessageHistory();

  const handleStart = async () => {
    try {
      await startAvatar({
        quality: AvatarQuality.High,
        avatarName: "katya",
        knowledgeId:
          process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID ||
          "ff7e415d125e41a3bfbf0665877075d4",
        voice: {
          rate: 1.2,
          emotion: VoiceEmotion.FRIENDLY,
          model: ElevenLabsModel.eleven_multilingual_v2,
        },
        language: language,
        voiceChatTransport: VoiceChatTransport.WEBSOCKET,
        sttSettings: { model: "gpt-4o-mini-transcribe" },
      });
      setSessionState(StreamingAvatarSessionState.CONNECTED);
    } catch (err) {
      console.error("Erreur lors du démarrage de l'avatar:", err);
    }
  };

  const handleStop = async () => {
    try {
      await stopVoiceChat();
      await stopAvatar();
      setSessionState(StreamingAvatarSessionState.INACTIVE);
    } catch (err) {
      console.error("Erreur lors de l'arrêt de l'avatar:", err);
    }
  };

  return (
    <StreamingAvatarProvider>
      <div
        ref={containerRef}
        className="relative flex flex-col items-center justify-center w-full min-h-screen bg-black bg-opacity-90"
      >
        {/* Cadre principal */}
        <div
          className="relative rounded-2xl border"
          style={{
            borderColor: "#480559",
            backgroundColor: "rgba(0,0,0,0.4)",
            padding: "8px",
            width: "fit-content",
          }}
        >
          {/* Affichage vidéo */}
          <div
            className="flex items-center justify-center overflow-hidden rounded-xl"
            style={{
              width: "700px",
              height: "480px",
              backgroundColor: "transparent",
            }}
          >
            {stream ? (
              <AvatarVideo stream={stream} />
            ) : (
              <img
                src="/katya_preview.jpg"
                alt="Avatar preview"
                className="rounded-xl"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  backgroundColor: "transparent",
                }}
              />
            )}
          </div>

          {/* Barre de contrôle */}
          <div
            className="flex justify-center items-center gap-3 mt-4"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid #480559",
              borderRadius: "12px",
              padding: "8px 14px",
            }}
          >
            {/* Micro */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#480559",
                border: "1px solid #480559",
              }}
              onClick={isVoiceChatActive ? stopVoiceChat : startVoiceChat}
            >
              {isVoiceChatActive ? "Couper micro" : "Activer micro"}
            </Button>

            {/* Saisie texte */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#480559",
                border: "1px solid #480559",
              }}
              onClick={() => console.log("Mode texte activé")}
            >
              Saisie texte
            </Button>

            {/* Fin */}
            <Button
              className="text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#a82424",
                border: "1px solid #a82424",
              }}
              onClick={handleStop}
            >
              Fin
            </Button>
          </div>
        </div>

        {/* Sélecteur langue + bouton lancer */}
        {sessionState === StreamingAvatarSessionState.INACTIVE && (
          <div
            className="flex justify-center items-center gap-3 mt-5 p-2 rounded-lg border"
            style={{
              borderColor: "#480559",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-white text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "#000",
                border: "1px solid #480559",
                width: "130px",
              }}
            >
              <option value="fr-FR">🇫🇷 Français</option>
              <option value="en-US">🇬🇧 Anglais</option>
            </Select>

            <Button
              className="text-white text-sm font-medium px-5 py-2 rounded-full transition-all"
              style={{
                backgroundColor: "#480559",
                border: "1px solid #480559",
              }}
              onClick={handleStart}
            >
              Lancer le chat
            </Button>
          </div>
        )}
      </div>
    </StreamingAvatarProvider>
  );
}
