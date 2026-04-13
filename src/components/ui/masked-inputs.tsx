/**
 * Masked Input Components
 * CPF, CNPJ, Telefone, CRM com máscaras e validação
 */

import { Input } from "./input";
import { Label } from "./label";
import {
  validarCPF,
  validarCNPJ,
  validarTelefone,
  validarCRM,
} from "@/lib/form-validators";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CPF INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function CPFInput({
  value,
  onChange,
  label = "CPF",
  placeholder = "000.000.000-00",
  required = false,
  error,
}: CPFInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);

    // Apply mask: XXX.XXX.XXX-XX
    if (val.length <= 3) {
      onChange(val);
    } else if (val.length <= 6) {
      onChange(`${val.slice(0, 3)}.${val.slice(3)}`);
    } else if (val.length <= 9) {
      onChange(
        `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`
      );
    } else {
      onChange(
        `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`
      );
    }
  };

  const isValid = value.length === 14 ? validarCPF(value) : true;

  return (
    <div className="space-y-2">
      {label && <Label>{label} {required && <span className="text-red-500">*</span>}</Label>}
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={14}
        className={error || (!isValid && value.length === 14) ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!isValid && value.length === 14 && (
        <p className="text-sm text-red-500">CPF inválido</p>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CNPJ INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CNPJInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function CNPJInput({
  value,
  onChange,
  label = "CNPJ",
  placeholder = "00.000.000/0000-00",
  required = false,
  error,
}: CNPJInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 14) val = val.slice(0, 14);

    // Apply mask: XX.XXX.XXX/XXXX-XX
    if (val.length <= 2) {
      onChange(val);
    } else if (val.length <= 5) {
      onChange(`${val.slice(0, 2)}.${val.slice(2)}`);
    } else if (val.length <= 8) {
      onChange(
        `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5)}`
      );
    } else if (val.length <= 12) {
      onChange(
        `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5, 8)}/${val.slice(8)}`
      );
    } else {
      onChange(
        `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5, 8)}/${val.slice(8, 12)}-${val.slice(12)}`
      );
    }
  };

  const isValid = value.length === 18 ? validarCNPJ(value) : true;

  return (
    <div className="space-y-2">
      {label && <Label>{label} {required && <span className="text-red-500">*</span>}</Label>}
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={18}
        className={error || (!isValid && value.length === 18) ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!isValid && value.length === 18 && (
        <p className="text-sm text-red-500">CNPJ inválido</p>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHONE INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  label = "Telefone",
  placeholder = "(11) 9XXXX-XXXX",
  required = false,
  error,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);

    // Apply mask: (XX) 9XXXX-XXXX or (XX) XXXXX-XXXX
    if (val.length <= 2) {
      onChange(val ? `(${val}` : "");
    } else if (val.length <= 7) {
      onChange(`(${val.slice(0, 2)}) ${val.slice(2)}`);
    } else {
      onChange(
        `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`
      );
    }
  };

  const isValid = value.length >= 14 ? validarTelefone(value) : true;

  return (
    <div className="space-y-2">
      {label && <Label>{label} {required && <span className="text-red-500">*</span>}</Label>}
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={15}
        className={error || (!isValid && value.length >= 14) ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!isValid && value.length >= 14 && (
        <p className="text-sm text-red-500">Telefone inválido</p>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRM INPUT (Médico)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CRMInputProps {
  value: string;
  onCRMChange: (crm: string) => void;
  state: string;
  onStateChange: (state: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function CRMInput({
  value,
  onCRMChange,
  state,
  onStateChange,
  label = "CRM",
  required = false,
  error,
}: CRMInputProps) {
  const handleCRMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    onCRMChange(val);
  };

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const isValid = value.length >= 4 ? validarCRM(value, state) : true;

  return (
    <div className="space-y-2">
      {label && <Label>{label} {required && <span className="text-red-500">*</span>}</Label>}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={value}
            onChange={handleCRMChange}
            placeholder="XXXXX"
            maxLength={6}
            className={error || (!isValid && value.length >= 4) ? "border-red-500" : ""}
          />
        </div>
        <select
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="">UF</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!isValid && value.length >= 4 && (
        <p className="text-sm text-red-500">CRM inválido</p>
      )}
    </div>
  );
}
