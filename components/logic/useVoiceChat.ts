import { useCallback, useEffect, useRef } from "react";
import { useStreamingAvatarContext } from "./context";

/**
 * 🎧 Voice Chat HeyGen (SDK v2+)
 * - Ne PAS passer de MediaStream au SDK (il gère le micro en interne)
 * - On déclenche tout de même la permission micro pour fiabiliser l’expérience
 * - États conservés : isMuted, isVoiceChatActive, isVoiceChatLoading
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

  /** 🎙️ Demande l’accès micro (déclenche le prompt navigateur) */
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

  /** 🚀 Démarre le Voice Chat (sans passer de stream au SDK) */
  const startVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      if (!avatarRef.current) {
        console.warn("⚠️ Avatar non initialisé pour le voice chat");
        return;
      }

      // Déjà actif → on aligne juste l’état mute si demandé
      if (isVoiceChatActive) {
        if (typeof isInputAudioMuted === "boolean") {
          if (isInputAudioMuted) avatarRef.current.muteInputAudio?.();
          else avatarRef.current.unmuteInputAudio?.();
          setIsMuted(!!isInputAudioMuted);
        }
        return;
      }

      setIsVoiceChatLoading(true);
      try {
        // Certains navigateurs exigent un AudioContext actif
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        } else if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        // Demander la permission micro (meilleure UX) — on ne passe PAS ce flux au SDK
        const micStream = await requestMicAccess();
        if (!micStream) throw new Error("Micro introuvable ou refusé");
        micStreamRef.current = micStream;

        // Lancement voice chat — sans 'stream'
        const startOptions: { isInputAudioMuted?: boolean } = {};
        if (typeof isInputAudioMuted === "boolean") {
          startOptions.isInputAudioMuted = isInputAudioMuted;
        }
        await avatarRef.current.startVoiceChat(startOptions);

        // On coupe le flux utilisé seulement pour l’autorisation : le SDK gère son propre flux
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;

        console.log("✅ VoiceChat connecté avec succès");
        setIsVoiceChatActive(true);
        setIsMuted(!!isInputAudioMuted);

        // (optionnel) handlers si exposés par le SDK
        avatarRef.current.on?.("voice_chat_reconnected" as any, () => {
          console.log("🔄 Reconnexion audio réussie");
          setIsVoiceChatActive(true);
        });
        avatarRef.current.on?.("voice_chat_disconnected" as any, () => {
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
    [avatarRef, isVoiceChatActive, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading],
  );

  /** 🛑 Arrête le Voice Chat et coupe le micro */
  const stopVoiceChat = useCallback(() => {
    if (!avatarRef.current) return;

    try {
      console.log("🛑 Arrêt du VoiceChat");
      avatarRef.current.closeVoiceChat?.();
    } catch (err) {
      console.error("⚠️ Erreur à l’arrêt du VoiceChat:", err);
    }

    // Stoppe tout flux temporaire si encore présent
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    setIsVoiceChatActive(false);
    setIsMuted(true);
  }, [avatarRef, setIsMuted, setIsVoiceChatActive]);

  /** 🔇 Mute / 🔊 Unmute via SDK */
  const muteInputAudio = useCallback(() => {
    if (!avatarRef.current) return;
    avatarRef.current.muteInputAudio?.();
    setIsMuted(true);
    console.log("🔇 Micro coupé");
  }, [avatarRef, setIsMuted]);

  const unmuteInputAudio = useCallback(() => {
    if (!avatarRef.current) return;
    avatarRef.current.unmuteInputAudio?.();
    setIsMuted(false);
    console.log("🎤 Micro réactivé");
  }, [avatarRef, setIsMuted]);

  /** ♻️ Nettoyage à la fermeture */
  useEffect(() => {
    return () => {
      try {
        stopVoiceChat();
      } finally {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        audioContextRef.current?.close();
        audioContextRef.current = null;
      }
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
