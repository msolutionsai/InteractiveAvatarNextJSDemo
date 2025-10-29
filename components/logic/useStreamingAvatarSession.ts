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

      return avatarRef.current;
    },
    [basePath, avatarRef],
  );

  /** 🎥 Quand le flux vidéo est prêt */
  const handleStream = useCallback(
    ({ detail }: { detail: MediaStream }) => {
      setStream(detail);
      setSessionState(StreamingAvatarSessionState.CONNECTED);
    },
    [setSessionState, setStream],
  );

  /** 🛑 Arrêt complet de la session */
  const stop = useCallback(async () => {
    avatarRef.current?.off(StreamingEvents.STREAM_READY, handleStream);
    avatarRef.current?.off(StreamingEvents.STREAM_DISCONNECTED, stop);
    clearMessages();
    stopVoiceChat();
    setIsListening(false);
    setIsUserTalking(false);
    setIsAvatarTalking(false);
    setStream(null);
    await avatarRef.current?.stopAvatar();
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

  /** 🚀 Démarrage de l'avatar avec fond transparent (méthode compatible SDK 2025) */
  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
        throw new Error("There is already an active session");
      }

      if (!avatarRef.current) {
        if (!token) throw new Error("Token is required");
        init(token);
      }

      if (!avatarRef.current) {
        throw new Error("Avatar is not initialized");
      }

      setSessionState(StreamingAvatarSessionState.CONNECTING);

      // ✅ Écouteurs principaux
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
      avatarRef.current.on(StreamingEvents.USER_END_MESSAGE, handleEndMessage);
      avatarRef.current.on(StreamingEvents.AVATAR_END_MESSAGE, handleEndMessage);

      // ✅ Nouvelle méthode : transparence appliquée via l'API interne Heygen
      try {
        // certains SDK Heygen exposent cette méthode directement :
        if (avatarRef.current.setBackground) {
          await avatarRef.current.setBackground({ type: "transparent" });
          console.log("🎨 Fond transparent appliqué via setBackground()");
        } else {
          console.warn("⚠️ setBackground non disponible dans ce SDK — fond transparent non forcé.");
        }
      } catch (err) {
        console.warn("⚠️ Impossible d'appliquer le fond transparent :", err);
      }

      // 🧩 config nettoyée sans backgroundType (plus d'erreur TypeScript)
      const patchedConfig: StartAvatarRequest = { ...config };

      await avatarRef.current.createStartAvatar(patchedConfig);
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
      handleEndMessage,
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
