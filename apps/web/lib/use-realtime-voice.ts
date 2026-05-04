"use client";

import { useRef, useState } from "react";
import { apiFetch } from "./api";

type VoiceState = "idle" | "connecting" | "live" | "error";

export function useRealtimeVoice(portfolioId?: string) {
  const [state, setState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("Voice inactive");
  const peerRef = useRef<RTCPeerConnection | null>(null);

  async function start(uiState?: unknown) {
    setState("connecting");
    setMessage("Requesting short-lived OpenAI voice session");
    try {
      const response = await apiFetch<{ session: { client_secret?: { value?: string }; model?: string } }>("/ai/voice/session", {
        method: "POST",
        body: JSON.stringify({ portfolioId, uiState })
      });
      const token = response.session.client_secret?.value;
      const model = response.session.model ?? "gpt-4o-realtime-preview";
      if (!token) throw new Error("OpenAI Realtime session did not include a client secret.");
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "response.output_text.done" && payload.text) setMessage(payload.text);
          if (payload.type === "response.done") setMessage("Voice response complete");
        } catch {
          setMessage("Voice event received");
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      if (!sdp.ok) throw new Error(`OpenAI Realtime WebRTC connection failed: ${sdp.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
      setState("live");
      setMessage("Real voice session live");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Voice connection failed");
    }
  }

  function stop() {
    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;
    setState("idle");
    setMessage("Voice inactive");
  }

  return { state, message, start, stop };
}
