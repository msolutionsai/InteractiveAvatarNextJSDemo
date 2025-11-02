import { useCallback, useEffect, useRef } from "react";
import { useStreamingAvatarContext } from "./context";

/**
 * 🎧 Gestion complète et stable du Voice Chat Heygen (2025)
 * Compatible avec ton contexte actuel (isMuted, isVoiceChatActive, etc.)
 */
export const useVoiceChat = () => {
  const {
    avatarRef,
    isMuted,
    setIsMuted,
    isVoiceChatActive,
    setIsVoiceChatActive,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
  } = useStreamingAvatarContext();

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /** 🎙️ Demande l’accès micro et vérifie les permissions */
  const requestMicAccess = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎤 Micro autorisé");
      return stream;
    } catch (err) {
      console.error("🚫 Accès micro refusé :", err);
      alert("Veuillez autoriser le micro pour parler à l’avatar.");
      return null;
    }
  };

  /** 🚀 Démarre le Voice Chat */
  const startVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      if (!avatarRef.current) {
        console.warn("⚠️ Avatar non initialisé pour le voice chat");
        return;
      }

      try {
        setIsVoiceChatLoading(true);

        // ⚙️ Initialisation audio context
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        // 🎙️ Récupération du flux micro
        const micStream = await requestMicAccess();
        if (!micStream) throw new Error("Micro introuvable ou refusé");
        micStreamRef.current = micStream;

        // 🔗 Connexion audio au SDK Heygen
        await avatarRef.current.startVoiceChat({
          stream: micStream,
          isInputAudioMuted,
        });

        console.log("✅ VoiceChat connecté avec succès");
        setIsVoiceChatActive(true);
        setIsMuted(!!isInputAudioMuted);

        // 🔁 Gestion reconnect/disconnect
        avatarRef.current.on("voice_chat_reconnected", () => {
          console.log("🔄 Reconnexion audio réussie");
          setIsVoiceChatActive(true);
        });

        avatarRef.current.on("voice_chat_disconnected", () => {
          console.warn("⚠️ VoiceChat déconnecté");
          setIsVoiceChatActive(false);
        });
      } catch (err) {
        console.error("❌ Erreur lors du démarrage VoiceChat:", err);
        setIsVoiceChatActive(false);
      } finally {
        setIsVoiceChatLoading(false);
      }
    },
    [
      avatarRef,
      setIsMuted,
      setIsVoiceChatActive,
      setIsVoiceChatLoading,
    ],
  );

  /** 🛑 Arrête le Voice Chat et coupe le micro */
  const stopVoiceChat = useCallback(() => {
    if (!avatarRef.current) return;

    try {
      console.log("🛑 Arrêt du VoiceChat");
      avatarRef.current.closeVoiceChat?.();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("⚠️ Erreur à l’arrêt du VoiceChat:", err);
    }

    setIsVoiceChatActive(false);
    setIsMuted(true);
  }, [avatarRef, setIsMuted, setIsVoiceChatActive]);

  /** 🔇 Mute audio input */
  const muteInputAudio = useCallback(() => {
    if (!avatarRef.current) return;
    avatarRef.current.muteInputAudio?.();
    setIsMuted(true);
    console.log("🔇 Micro coupé");
  }, [avatarRef, setIsMuted]);

  /** 🔊 Unmute audio input */
  const unmuteInputAudio = useCallback(() => {
    if (!avatarRef.current) return;
    avatarRef.current.unmuteInputAudio?.();
    setIsMuted(false);
    console.log("🎤 Micro réactivé");
  }, [avatarRef, setIsMuted]);

  /** ♻️ Nettoyage à la fermeture */
  useEffect(() => {
    return () => {
      stopVoiceChat();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, [stopVoiceChat]);

  return {
    startVoiceChat,
    stopVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
  };
};
