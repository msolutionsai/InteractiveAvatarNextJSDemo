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
import { AvatarControls } from "./AvatarSession/AvatarControls";
import { useVoiceChat } from "./logic/useVoiceChat";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
} from "./logic";
import { LoadingIcon } from "./Icons";

// Configuration par défaut du moteur (types stricts: NE PAS ajouter de champs non supportés)
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Katya_Pink_Suit_public",
  knowledgeId: "ff7e415d125e41a3bfbf0665877705d4",
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_multilingual_v2,
  },
  language: "fr",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat, stopVoiceChat, isVoiceChatActive } = useVoiceChat();

  const [config] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const [selectedLanguage, setSelectedLanguage] = useState("fr");

  const mediaStream = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const startSessionV2 = useMemoizedFn(async () => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("Stream ready:", event.detail);
      });

      const updatedConfig: StartAvatarRequest = {
        ...config,
        language: selectedLanguage,
      };

      await startAvatar(updatedConfig);
      await startVoiceChat();
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream]);

  const isConnected =
    sessionState === StreamingAvatarSessionState.CONNECTED;
  const isConnecting =
    sessionState === StreamingAvatarSessionState.CONNECTING;

  return (
    <div className="w-full flex items-center justify-center bg-black">
      <div
        className="flex w-full max-w-[720px] flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#18181b" }}
      >
        {/* Zone vidéo / préview avec fond violet-noir (évite l’écran vert) */}
        <div
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{
            height: "480px",
            background:
              "radial-gradient(ellipse at center, #0e0c1d 0%, #1b0033 100%)",
          }}
        >
          {isConnected ? (
            <AvatarVideo ref={mediaStream} />
          ) : isConnecting ? (
            <div className="flex items-center justify-center">
              <LoadingIcon />
            </div>
          ) : (
            <>
              {/* Écran d’accueil avec CTA alignés sur UNE seule ligne, en bas */}
              <div className="absolute inset-0 flex items-center justify-center" />
              <div
                className="absolute inset-x-0 bottom-0 z-10 flex w-full items-center justify-center gap-3 p-4"
                style={{ background: "rgba(0, 0, 0, 0.35)" }}
              >
                <select
                  className="min-w-[180px] rounded-lg px-4 py-2 text-sm text-white outline-none"
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{ background: "rgba(0, 0, 0, 0.5)" }}
                  value={selectedLanguage}
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                </select>

                <button
                  className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
                  onClick={startSessionV2}
                  style={{
                    background: "#480559",
                    boxShadow: "0 4px 15px rgba(72, 5, 89, 0.4)",
                  }}
                >
                  Lancer le chat
                </button>
              </div>
            </>
          )}
        </div>

        {/* Barre de contrôle après connexion — UNE seule ligne, FR, un seul bouton rouge */}
        {isConnected && (
          <div
            className="flex items-center justify-between gap-3 p-3"
            style={{ background: "#27272a" }}
          >
            <div className="flex min-w-0 flex-1">
              <AvatarControls />
            </div>

            {isVoiceChatActive && (
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                onClick={stopVoiceChat}
                style={{ background: "#dc2626" }}
              >
                Interrompre
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider
      basePath={process.env.NEXT_PUBLIC_BASE_API_URL}
    >
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
