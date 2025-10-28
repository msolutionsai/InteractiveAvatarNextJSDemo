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

import { Button } from "./Button";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { AvatarControls } from "./AvatarSession/AvatarControls";
import { useVoiceChat } from "./logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";
import { MessageHistory } from "./AvatarSession/MessageHistory";

// ✅ CONFIGURATION PRÉ-REMPLIE
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High, // ✅ Qualité haute
  avatarName: "Katya_Pink_Suit_public", // ✅ Votre avatar Katya
  knowledgeId: "ff7e415d125e41a3bfbf0665877705d4", // ✅ Votre knowledge base
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_multilingual_v2,
  },
  language: "fr", // ✅ Français par défaut
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const [selectedLanguage, setSelectedLanguage] = useState("fr"); // Français par défaut

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

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
      });

      // Mettre à jour la langue avant de démarrer
      const updatedConfig = { ...config, language: selectedLanguage };
      await startAvatar(updatedConfig);

      if (isVoiceChat) {
        await startVoiceChat();
      }
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
  }, [mediaStream, stream]);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ✅ CONTENEUR - Format réduit en largeur, fond noir conservé */}
      <div 
        className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden"
        style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}
      >
        {/* ✅ ZONE AVATAR - Ratio 16:9 pour qualité optimale */}
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            // ✅ INTERFACE SIMPLIFIÉE - Fond noir conservé
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              {/* ✅ PETIT CADRE TRANSPARENT À 80% */}
              <div 
                className="rounded-2xl p-6 flex flex-col items-center gap-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)', // ✅ Transparent 80%
                  backdropFilter: 'blur(10px)',
                  maxWidth: '350px',
                  width: '90%'
                }}
              >
                {/* ✅ SÉLECTEUR DE LANGUE - Français en premier */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-white border-0 outline-none"
                  style={{ 
                    fontSize: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="pt">🇵🇹 Português</option>
                </select>

                {/* ✅ BOUTON "CHAT NOW" - Couleur violette #480559 */}
                <button
                  onClick={() => startSessionV2(true)}
                  className="w-full px-8 py-3 rounded-full text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl"
                  style={{
                    background: '#480559', // ✅ Couleur de votre site
                    boxShadow: '0 4px 15px rgba(72, 5, 89, 0.4)'
                  }}
                >
                  Chat now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ✅ CONTRÔLES (quand l'avatar est connecté) */}
        {sessionState === StreamingAvatarSessionState.CONNECTED && (
          <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
            <AvatarControls />
          </div>
        )}
        
        {/* ✅ LOADING */}
        {sessionState === StreamingAvatarSessionState.CONNECTING && (
          <div className="flex items-center justify-center p-8">
            <LoadingIcon />
          </div>
        )}
      </div>

      {/* ✅ HISTORIQUE DES MESSAGES */}
      {sessionState === StreamingAvatarSessionState.CONNECTED && (
        <MessageHistory />
      )}
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
