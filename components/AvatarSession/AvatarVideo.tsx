import React, { forwardRef } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";

import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

export const AvatarVideo = forwardRef<HTMLVideoElement>((_, ref) => {
  const { sessionState, stopAvatar } = useStreamingAvatarSession();
  const { connectionQuality } = useConnectionQuality();

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Qualité de connexion (discrète en haut à gauche) */}
      {connectionQuality !== ConnectionQuality.UNKNOWN && (
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs rounded-md px-2 py-1 z-20">
          Qualité : {connectionQuality}
        </div>
      )}

      {/* Bouton de fermeture visible uniquement une fois connecté */}
      {isLoaded && (
        <Button
          className="absolute top-3 right-3 !p-2 bg-zinc-700/60 hover:bg-zinc-700 z-20 rounded-full"
          onClick={stopAvatar}
          aria-label="Fermer"
        >
          <CloseIcon />
        </Button>
      )}

      {/* Vidéo de l’avatar */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background:
            "radial-gradient(ellipse at center, #0e0c1d 0%, #1b0033 100%)",
        }}
      >
        <track kind="captions" />
      </video>

      {/* État de chargement avant la connexion */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm z-10">
          Chargement de l’avatar...
        </div>
      )}
    </div>
  );
});

AvatarVideo.displayName = "AvatarVideo";
