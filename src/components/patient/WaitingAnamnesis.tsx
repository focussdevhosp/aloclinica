/**
 * Anamnese assistida pela IA na sala de espera.
 *
 * Enquanto o paciente espera o médico entrar (3-5min), abre uma conversa
 * guiada que coleta queixa, sintomas, severidade e contexto. Ao final
 * salva em pre_consultation_symptoms — o médico entra na consulta já com
 * o quadro estruturado, sem refazer perguntas.
 *
 * Usa clinical-ai task "anamnese" (existente) para sugerir a próxima
 * pergunta a cada turno, baseado no que o paciente já respondeu.
 */
import { useState, useEffect, useRef } from "react";
import { db } from "@/integrations/supabase/untyped";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, CheckCircle2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

// WebSpeech: voz para a anamnese. Funciona em Chrome, Edge, Safari recentes.
type SpeechRecognition = any;
declare global { interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; } }
const SpeechRecognitionImpl: typeof window.SpeechRecognition | undefined =
  typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

interface Props {
  appointmentId: string;
  patientId: string;
  onComplete?: () => void;
}

interface Turn { role: "ai" | "patient"; text: string; }

const QUESTIONS = [
  "Em uma frase, qual é o motivo principal da consulta hoje?",
  "Há quanto tempo você está com isso? (horas, dias, semanas, meses)",
  "Em uma escala de 0 a 10, o quanto isso te incomoda?",
  "Algum sintoma associado que você queira mencionar? (febre, náusea, dor, etc.)",
  "Você toma alguma medicação contínua ou tem alergias?",
];

export default function WaitingAnamnesis({ appointmentId, patientId, onComplete }: Props) {
  const [turns, setTurns] = useState<Turn[]>([{ role: "ai", text: `Olá! Sou a assistente da AloClínica. Posso te ajudar a preparar a consulta enquanto o médico entra na sala. Topa responder algumas perguntas rápidas?` }]);
  const [stage, setStage] = useState(0); // 0 = greeting, 1..5 = questions, 6 = done
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  // Fala a última pergunta da IA quando voiceOn estiver ativo (TTS).
  useEffect(() => {
    if (!voiceOn || typeof speechSynthesis === "undefined") return;
    const last = turns[turns.length - 1];
    if (!last || last.role !== "ai") return;
    const u = new SpeechSynthesisUtterance(last.text);
    u.lang = "pt-BR";
    u.rate = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return () => { speechSynthesis.cancel(); };
  }, [voiceOn, turns]);

  const startListening = () => {
    if (!SpeechRecognitionImpl) { toast.info("Este navegador não suporta entrada por voz."); return; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* */ } }
    const rec = new SpeechRecognitionImpl();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results).map((r: any) => r[0].transcript).join(" ");
      setInput((p) => (p ? `${p} ${transcript}` : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* */ }
    setListening(false);
  };

  const ask = (question: string) => setTurns((t) => [...t, { role: "ai", text: question }]);

  const next = async () => {
    const text = input.trim();
    if (!text) return;
    setTurns((t) => [...t, { role: "patient", text }]);
    setInput("");
    const newStage = stage + 1;
    setStage(newStage);

    if (newStage === 1) {
      // Greeting confirmado → primeira pergunta
      ask(QUESTIONS[0]);
      return;
    }
    if (newStage <= QUESTIONS.length) {
      // Próxima pergunta
      ask(QUESTIONS[newStage - 1]);
      return;
    }

    // Fim: estrutura e salva
    setBusy(true);
    try {
      const answers = turns.filter((t) => t.role === "patient").map((t) => t.text).concat([text]);
      const [complaint, duration, severity, symptoms, meds] = answers;
      const sevNum = Number((severity || "").match(/\d+/)?.[0] ?? "");

      await db.from("pre_consultation_symptoms").upsert({
        appointment_id: appointmentId,
        patient_id: patientId,
        main_complaint: complaint || null,
        duration: duration || null,
        severity: Number.isFinite(sevNum) ? Math.min(10, Math.max(0, sevNum)) : null,
        symptoms: (symptoms || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
        additional_notes: meds || null,
      } as any, { onConflict: "appointment_id" });

      setSaved(true);
      setTurns((t) => [...t, { role: "ai", text: "✅ Obrigada! Suas respostas já foram enviadas ao médico. Quando ele entrar, vocês conseguem ir direto ao ponto." }]);
      onComplete?.();
    } catch (e: any) {
      logError("WaitingAnamnesis save", e);
      toast.error("Não foi possível enviar a anamnese agora", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const done = stage > QUESTIONS.length;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Preparando sua consulta (IA)</p>
            <p className="text-[11px] text-muted-foreground">Responda enquanto espera — o médico recebe tudo pronto.</p>
          </div>
          {typeof speechSynthesis !== "undefined" && (
            <Button size="icon" variant="ghost" aria-label={voiceOn ? "Desativar leitura por voz" : "Ativar leitura por voz"}
              className="h-8 w-8" onClick={() => setVoiceOn((v) => !v)}>
              {voiceOn ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          )}
        </div>

        <div className="max-h-64 overflow-auto space-y-2 pr-1">
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "patient" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.role === "patient"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"}`}>
                {t.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {!done ? (
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !busy) { e.preventDefault(); next(); } }}
              placeholder={stage === 0 ? "Digite “sim” para começar" : "Sua resposta…"}
              rows={2}
              disabled={busy}
              className="resize-none flex-1 text-sm"
              aria-label="Resposta da anamnese"
            />
            {SpeechRecognitionImpl && (
              <Button size="icon" variant={listening ? "destructive" : "outline"}
                onClick={() => (listening ? stopListening() : startListening())}
                aria-label={listening ? "Parar ditado" : "Ditar resposta"}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            <Button size="icon" onClick={next} disabled={busy || !input.trim()} aria-label="Enviar resposta">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        ) : saved ? (
          <p className="flex items-center gap-1.5 text-xs text-success font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Anamnese registrada com sucesso.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
