"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";
import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

type AvatarVideoProps = {
  stream: MediaStream | null; // ✅ on déclare la prop attendue
};

export const AvatarVideo = forwardRef<HTMLVideoElement, AvatarVideoProps>(
  ({ stream }, ref) => {
    const { sessionState, stopAvatar } = useStreamingAvatarSession();
    const { connectionQuality } = useConnectionQuality();
    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

    // ✅ Injecte le flux dans la vidéo
    const internalRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      const videoEl = (ref as React.RefObject<HTMLVideoElement>)?.current || internalRef.current;
      if (videoEl && stream) {
        videoEl.srcObject = stream;
      }
    }, [stream, ref]);

    return (
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl"
        style={{
          backgroundColor: "#00000000", // ✅ fond transparent (pas de vert)
          backgroundImage: "url('/freevox_overlay.png')", // logo FreeVox
          backgroundRepeat: "no-repeat",
          backgroundPosition: "30px 30px",
          backgroundSize: "auto 80px",
        }}
      >
        {/* Indicateur qualité */}
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-3 py-1 rounded-lg z-10">
            Qualité de connexion : {connectionQuality}
          </div>
        )}

        {/* Bouton fermer */}
        {isLoaded && (
          <Button
            className="absolute top-3 right-3 !p-2 bg-[#480559]/80 hover:bg-[#480559] text-white rounded-full z-20"
            onClick={stopAvatar}
          >
            <CloseIcon />
          </Button>
        )}

        {/* Vidéo Heygen */}
        <video
          ref={ref || internalRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain", // garde ton cadrage actuel
            backgroundColor: "transparent",
            zIndex: 5,
          }}
        >
          <track kind="captions" />
        </video>

        {/* État de chargement */}
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
