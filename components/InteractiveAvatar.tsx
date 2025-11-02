import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
} from "@heygen/streaming-avatar";
import { useCallback } from "react";

import {
  StreamingAvatarSessionState,
  useStreamingAvatarContext,
} from "./logic/context";
import { useVoiceChat } from "./logic/useVoiceChat";
import { useMessageHistory } from "./logic/useMessageHistory";

/**
 * 🎯 Gestion complète de la session Heygen
 * - Conserve ton affichage chroma key original
 * - Ajoute la logique voix/texte complète (agent_response, transcript)
 * - Stabilise la session sans stop prématuré
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

  /** 🧠 Initialisation du client Heygen avec écoute IA */
  const init = useCallback(
    (token: string) => {
      avatarRef.current = new StreamingAvatar({
        token,
        basePath,
      });

      console.log("🧩 Avatar initialisé avec basePath:", basePath);

      // 🔊 Événements IA intelligents (voix / texte)
      avatarRef.current.on("agent_response", (response: any) => {
        console.log("🤖 Réponse IA:", response);
      });

      avatarRef.current.on("transcript", (transcript: any) => {
        console.log("🎙️ Transcription utilisateur:", transcript);
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

  /** 🛑 Arrêt complet de la session */
  const stop = useCallback(async () => {
    console.log("🛑 Arrêt manuel de la session");

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

  /** 🚀 Démarrage de la session (chroma key + audio + texte) */
  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
        console.warn("⚠️ Session déjà active, relance ignorée");
        return avatarRef.current;
      }

      if (!avatarRef.current) {
        if (!token) throw new Error("Token requis");
        init(token);
      }

      if (!avatarRef.current) {
        throw new Error("Avatar non initialisé");
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

      // ⚙️ Config visuelle inchangée (chroma key conservé)
      const patchedConfig: StartAvatarRequest = {
        ...config,
      };

      await avatarRef.current.createStartAvatar(patchedConfig);

      // 🎨 Rendu chroma key (identique à ton affichage d’avant)
      const videoEl = document.querySelector("video");
      if (videoEl) {
        videoEl.style.backgroundColor = "transparent";
        videoEl.style.mixBlendMode = "lighten";
        videoEl.style.filter = "chroma(color=green)";
      }

      console.log("✅ Avatar lancé (voix/texte activés, visuel inchangé)");
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
export default InteractiveAvatar;
