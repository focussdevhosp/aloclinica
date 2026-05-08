import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrescriptionData } from './usePrescriptionData';

// Mock supabase (db = supabase aliased em supabase/untyped.ts).
// Sem appointmentId, o useEffect retorna cedo e nenhuma chamada acontece.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('usePrescriptionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com 1 medicamento vazio (template) e diagnóstico vazio', () => {
    const { result } = renderHook(() => usePrescriptionData());

    expect(result.current.data).toBeDefined();
    // O hook começa com um template vazio para o usuário começar a preencher
    expect(result.current.data.medications).toHaveLength(1);
    expect(result.current.data.medications[0]).toEqual({
      name: '', dosage: '', frequency: '', duration: '', instructions: '',
    });
    expect(result.current.data.diagnosis).toBe('');
    expect(result.current.errors).toEqual([]);
  });

  it('addMedication adiciona um novo template vazio à lista', () => {
    const { result } = renderHook(() => usePrescriptionData());
    const initialCount = result.current.data.medications.length;

    act(() => { result.current.addMedication(); });

    expect(result.current.data.medications).toHaveLength(initialCount + 1);
  });

  it('removeMedication remove pelo índice', () => {
    const { result } = renderHook(() => usePrescriptionData());

    act(() => {
      result.current.addMedication();
      result.current.addMedication();
    });
    const before = result.current.data.medications.length;

    act(() => { result.current.removeMedication(0); });

    expect(result.current.data.medications).toHaveLength(before - 1);
  });

  it('updateMedication substitui o item no índice', () => {
    const { result } = renderHook(() => usePrescriptionData());

    const updatedMed = {
      name: 'Amoxicilina',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      duration: '7 dias',
      instructions: 'Tomar com água',
    };

    act(() => { result.current.updateMedication(0, updatedMed); });

    expect(result.current.data.medications[0]).toEqual(updatedMed);
  });

  it('updateField atualiza o campo diagnosis', () => {
    const { result } = renderHook(() => usePrescriptionData());
    const diagnosis = 'Infecção respiratória aguda';

    act(() => { result.current.updateField('diagnosis', diagnosis); });

    expect(result.current.data.diagnosis).toBe(diagnosis);
  });

  it('validate retorna false quando faltam campos obrigatórios', () => {
    const { result } = renderHook(() => usePrescriptionData());

    let isValid = true;
    act(() => { isValid = result.current.validate(); });

    expect(isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('validate retorna true com diagnóstico preenchido e ao menos 1 medicamento completo', () => {
    const { result } = renderHook(() => usePrescriptionData());

    act(() => {
      result.current.updateField('diagnosis', 'Infecção respiratória aguda');
      result.current.updateMedication(0, {
        name: 'Amoxicilina',
        dosage: '500mg',
        frequency: '8 em 8 horas',
        duration: '7 dias',
        instructions: 'Tomar com água',
      });
    });

    let isValid = false;
    act(() => { isValid = result.current.validate(); });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('validMedications filtra apenas os que possuem name preenchido', () => {
    const { result } = renderHook(() => usePrescriptionData());

    act(() => {
      result.current.addMedication();
      result.current.updateMedication(0, {
        name: 'Amoxicilina',
        dosage: '500mg',
        frequency: '8 em 8 horas',
        duration: '7 dias',
        instructions: '',
      });
    });

    expect(result.current.validMedications).toHaveLength(1);
    expect(result.current.validMedications[0].name).toBe('Amoxicilina');
  });
});
