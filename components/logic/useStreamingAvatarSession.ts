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
    handleEndMessage, // peut rester non utilisé selon ton contexte
    clearMessages,
  } = useStreamingAvatarContext();

  const { stopVoiceChat } = useVoiceChat();
  useMessageHistory();

  /** 🧠 Initialisation du client Heygen */
  const init = useCallback(
    (token: string) => {
      const client = new StreamingAvatar({
        token,
        basePath,
      });
      avatarRef.current = client;

      console.log("🧩 Avatar initialisé avec basePath:", basePath);

      // ✅ Écouteurs génériques (logs utiles)
      client.on("agent_response", (r: any) => {
        console.log("🤖 Réponse agent:", r);
      });
      client.on("transcript", (t: any) => {
        console.log("🎙️ Transcription:", t);
      });
      client.on("error", (err: any) => {
        console.error("⚠️ Erreur Streaming:", err);
      });

      return client;
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

    // Retire uniquement les écouteurs ajoutés avec des références stables
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

  /** 🚀 Démarrage de l'avatar (config strictement typée) */
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

      const client = avatarRef.current;

      // ✅ Écouteurs streaming
      client.on(StreamingEvents.STREAM_READY, handleStream);
      client.on(StreamingEvents.STREAM_DISCONNECTED, stop);
      client.on(
        StreamingEvents.CONNECTION_QUALITY_CHANGED,
        ({ detail }: { detail: ConnectionQuality }) =>
          setConnectionQuality(detail),
      );
      client.on(StreamingEvents.USER_START, () => setIsUserTalking(true));
      client.on(StreamingEvents.USER_STOP, () => setIsUserTalking(false));
      client.on(StreamingEvents.AVATAR_START_TALKING, () =>
        setIsAvatarTalking(true),
      );
      client.on(StreamingEvents.AVATAR_STOP_TALKING, () =>
        setIsAvatarTalking(false),
      );
      client.on(
        StreamingEvents.USER_TALKING_MESSAGE,
        handleUserTalkingMessage,
      );
      client.on(
        StreamingEvents.AVATAR_TALKING_MESSAGE,
        handleStreamingTalkingMessage,
      );

      // ⛔️ Ne PAS ajouter de propriétés hors contrat ici.
      const startConfig = { ...config } satisfies StartAvatarRequest;

      await client.createStartAvatar(startConfig);

      console.log("✅ Avatar lancé et session maintenue active");
      return client;
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
