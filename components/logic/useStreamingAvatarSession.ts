import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
} from "@heygen/streaming-avatar";
import { useCallback } from "react";

import {
  StreamingAvatarSessionState,
  useStreamingAvatarContext,
} from "./context";
import { useVoiceChat } from "./useVoiceChat";
import { useMessageHistory } from "./useMessageHistory";

/**
 * 🎯 Hook de gestion de la session Heygen
 * - Initialise le flux vidéo
 * - Gère les événements IA (agent_response, transcript)
 * - Maintient la session active pour la voix et le texte
 */
export const useStreamingAvatarSession = () => {
  const {
    avatarRef,
    basePath,
    sessionState,
    setSessionState,
    stream,
    setStream,
    setIsListening,
    setIsUserTalking,
    setIsAvatarTalking,
    setConnectionQuality,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
    clearMessages,
  } = useStreamingAvatarContext();

  const { stopVoiceChat } = useVoiceChat();
  useMessageHistory();

  /** 🧠 Initialisation du client Heygen */
  const init = useCallback(
    (token: string) => {
      avatarRef.current = new StreamingAvatar({
        token,
        basePath,
      });

      console.log("🧩 Avatar initialisé avec basePath:", basePath);

      // ✅ Ajout des écouteurs universels pour la session
      avatarRef.current.on("agent_response", (r: any) => {
        console.log("🤖 Réponse agent:", r);
      });

      avatarRef.current.on("transcript", (t: any) => {
        console.log("🎙️ Transcription:", t);
      });

      avatarRef.current.on("error", (err: any) => {
        console.error("⚠️ Erreur Streaming:", err);
      });

      return avatarRef.current;
    },
    [basePath, avatarRef],
  );

  /** 🎥 Quand le flux vidéo est prêt */
  const handleStream = useCallback(
    ({ detail }: { detail: MediaStream }) => {
      detail.getVideoTracks().forEach((track) => {
        const settings = track.getSettings();
        console.log("🎨 Flux vidéo prêt :", settings);
      });

      setStream(detail);
      setSessionState(StreamingAvatarSessionState.CONNECTED);
    },
    [setSessionState, setStream],
  );

  /** 🛑 Arrêt complet de la session (appelé seulement manuellement) */
  const stop = useCallback(async () => {
    console.log("🛑 Arrêt manuel de la session Heygen");

    avatarRef.current?.off(StreamingEvents.STREAM_READY, handleStream);
    avatarRef.current?.off(StreamingEvents.STREAM_DISCONNECTED, stop);

    clearMessages();
    stopVoiceChat();
    setIsListening(false);
    setIsUserTalking(false);
    setIsAvatarTalking(false);
    setStream(null);

    try {
      await avatarRef.current?.stopAvatar();
    } catch (err) {
      console.warn("⚠️ Erreur lors de l'arrêt de l'avatar:", err);
    }

    setSessionState(StreamingAvatarSessionState.INACTIVE);
  }, [
    handleStream,
    setSessionState,
    setStream,
    avatarRef,
    setIsListening,
    stopVoiceChat,
    clearMessages,
    setIsUserTalking,
    setIsAvatarTalking,
  ]);

  /** 🚀 Démarrage de l'avatar avec fond transparent et session stable */
  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
        console.warn("⚠️ Session déjà active, relance ignorée");
        return avatarRef.current;
      }

      if (!avatarRef.current) {
        if (!token) throw new Error("Token requis pour initAvatar()");
        init(token);
      }

      if (!avatarRef.current) {
        throw new Error("Avatar non initialisé");
      }

      setSessionState(StreamingAvatarSessionState.CONNECTING);

      // ✅ Écouteurs streaming
      avatarRef.current.on(StreamingEvents.STREAM_READY, handleStream);
      avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, stop);
      avatarRef.current.on(
        StreamingEvents.CONNECTION_QUALITY_CHANGED,
        ({ detail }: { detail: ConnectionQuality }) =>
          setConnectionQuality(detail),
      );
      avatarRef.current.on(StreamingEvents.USER_START, () =>
        setIsUserTalking(true),
      );
      avatarRef.current.on(StreamingEvents.USER_STOP, () =>
        setIsUserTalking(false),
      );
      avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () =>
        setIsAvatarTalking(true),
      );
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () =>
        setIsAvatarTalking(false),
      );
      avatarRef.current.on(
        StreamingEvents.USER_TALKING_MESSAGE,
        handleUserTalkingMessage,
      );
      avatarRef.current.on(
        StreamingEvents.AVATAR_TALKING_MESSAGE,
        handleStreamingTalkingMessage,
      );

      // ⚙️ Patch du fond vert et stabilité
      const patchedConfig: StartAvatarRequest = {
        ...config,
        background: "transparent",
      };

      await avatarRef.current.createStartAvatar(patchedConfig);

      // ✅ On ignore volontairement AVATAR_END_MESSAGE
      //    pour éviter la fermeture prématurée du flux
      console.log("✅ Avatar lancé et session maintenue active");

      // 🧠 Ajustement post-lancement
      const videoEl = document.querySelector("video");
      if (videoEl) {
        videoEl.style.backgroundColor = "transparent";
        videoEl.style.mixBlendMode = "lighten";
        videoEl.style.filter = "chroma(color=green)";
      }

      return avatarRef.current;
    },
    [
      init,
      handleStream,
      stop,
      setSessionState,
      avatarRef,
      sessionState,
      setConnectionQuality,
      setIsUserTalking,
      handleUserTalkingMessage,
      handleStreamingTalkingMessage,
      setIsAvatarTalking,
    ],
  );

  return {
    avatarRef,
    sessionState,
    stream,
    initAvatar: init,
    startAvatar: start,
    stopAvatar: stop,
  };
};
