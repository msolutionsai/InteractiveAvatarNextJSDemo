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

// ✅ CONFIGURATION avec FOND NOIR
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
  background: {
    type: "color",
    value: "#000000"
  },
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat, stopVoiceChat, isVoiceChatting } = useVoiceChat();

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
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

      const updatedConfig = { 
        ...config, 
        language: selectedLanguage,
        background: { type: "color", value: "#000000" }
      };
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
    // ✅ Container responsive - s'adapte à l'iframe
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: '#000' }}>
      <div 
        className="flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{ 
          width: '100%',
          maxWidth: '600px', // ✅ Taille réduite et adaptable
          background: '#18181b'
        }}
      >
        {/* ✅ ZONE AVATAR - Format compact */}
        <div 
          className="relative w-full bg-black overflow-hidden flex flex-col items-center justify-center"
          style={{ height: '400px' }} // ✅ Hauteur fixe réduite
        >
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div 
                className="rounded-2xl p-6 flex flex-col items-center gap-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  maxWidth: '320px',
                  width: '90%'
                }}
              >
                {/* SÉLECTEUR DE LANGUE */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-white border-0 outline-none text-sm"
                  style={{ 
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

                {/* BOUTON CHAT NOW */}
                <button
                  onClick={() => startSessionV2(true)}
                  className="w-full px-6 py-2 rounded-full text-white font-semibold transition-all hover:scale-105"
                  style={{
                    background: '#480559',
                    fontSize: '16px',
                    boxShadow: '0 4px 15px rgba(72, 5, 89, 0.4)'
                  }}
                >
                  Chat now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ✅ CONTRÔLES EN BAS - Compacts */}
        <div className="flex flex-col gap-2 items-center justify-center p-3" style={{ background: '#27272a' }}>
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <div className="w-full flex flex-col items-center gap-2">
              <AvatarControls />
              
              {isVoiceChatting && (
                <button
                  onClick={stopVoiceChat}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: '#dc2626',
                    boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  Interrompre
                </button>
              )}
            </div>
          ) : sessionState === StreamingAvatarSessionState.CONNECTING ? (
            <LoadingIcon />
          ) : null}
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
