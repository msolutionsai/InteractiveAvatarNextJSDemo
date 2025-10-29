"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";
import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

type AvatarVideoProps = {
  stream: MediaStream | null; // ✅ flux vidéo reçu du SDK
};

export const AvatarVideo = forwardRef<HTMLVideoElement, AvatarVideoProps>(
  ({ stream }, ref) => {
    const { sessionState, stopAvatar } = useStreamingAvatarSession();
    const { connectionQuality } = useConnectionQuality();
    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

    // ✅ injection du flux dans la balise vidéo
    const internalRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      const videoEl =
        (ref as React.RefObject<HTMLVideoElement>)?.current ||
        internalRef.current;
      if (videoEl && stream) {
        videoEl.srcObject = stream;
      }
    }, [stream, ref]);

    return (
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl"
        style={{
          // ✅ fond noir semi-transparent (aucune image)
          backgroundColor: "rgba(0, 0, 0, 0.85)",
        }}
      >
        {/* Indicateur de qualité */}
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-3 py-1 rounded-lg z-10">
            Qualité de connexion : {connectionQuality}
          </div>
        )}

        {/* Bouton de fermeture */}
        {isLoaded && (
          <Button
            className="absolute top-3 right-3 !p-2 bg-[#480559]/80 hover:bg-[#480559] text-white rounded-full z-20"
            onClick={stopAvatar}
            aria-label="Fermer"
          >
            <CloseIcon />
          </Button>
        )}

        {/* Flux vidéo HeyGen */}
        <video
          ref={ref || internalRef}
          autoPlay
          playsInline
          muted={false} // ✅ audio activé pour entendre la voix
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "transparent",
            zIndex: 5,
          }}
        >
          <track kind="captions" />
        </video>

        {/* Message de chargement */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            Chargement de l’avatar…
          </div>
        )}
      </div>
    );
  }
);

AvatarVideo.displayName = "AvatarVideo";
