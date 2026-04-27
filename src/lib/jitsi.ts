/**
 * MiroTalk P2P integration for AloClínica teleconsultation.
 * Self-hosted on https://meet.telemedicinaaloclinica.sbs (substitui Jitsi).
 */

export const JITSI_BASE_URL = "https://meet.telemedicinaaloclinica.sbs";

export function gerarRoomId(appointmentId: string): string {
  return `consulta-${appointmentId}`;
}

export function getJitsiUrl(roomId: string, displayName: string): string {
  const params = new URLSearchParams({
    name: displayName,
    audio: "1",
    video: "1",
    screen: "0",
    notify: "0",
    hide: "0",
  });
  return `${JITSI_BASE_URL}/join/${encodeURIComponent(roomId)}?${params.toString()}`;
}
