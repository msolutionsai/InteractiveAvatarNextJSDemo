"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";
import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

type AvatarVideoProps = {
  stream: MediaStream | null;
};

export const AvatarVideo = forwardRef<HTMLVideoElement, AvatarVideoProps>(
  ({ stream }, ref) => {
    const { sessionState, stopAvatar } = useStreamingAvatarSession();
    const { connectionQuality } = useConnectionQuality();
    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

    const internalRef = useRef<HTMLVideoElement>(null);

    // ✅ Lier le flux vidéo
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
        className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl bg-transparent"
      >
        {/* ✅ Canvas pour appliquer la transparence (chroma key) */}
        <canvas
          id="avatarCanvas"
          className="absolute inset-0 w-full h-full"
          style={{
            display: "none", // on l'activera dynamiquement
            borderRadius: "12px",
            backgroundColor: "transparent",
            zIndex: 2,
          }}
        ></canvas>

        {/* ✅ Vidéo Heygen brute (fond vert à filtrer via canvas) */}
        <video
          ref={ref || internalRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full"
          style={{
            objectFit: "contain",
            backgroundColor: "transparent",
            zIndex: 1,
          }}
        >
          <track kind="captions" />
        </video>

        {/* Indicateur qualité connexion */}
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
          >
            <CloseIcon />
          </Button>
        )}

        {/* Message de chargement */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm z-30">
            Chargement de l’avatar…
          </div>
        )}
      </div>
    );
  }
);

AvatarVideo.displayName = "AvatarVideo";
