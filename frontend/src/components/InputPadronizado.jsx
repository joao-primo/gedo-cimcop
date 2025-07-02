"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatters, validators } from "../utils/formatters"

const InputPadronizado = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  formatType,
  validacao,
  required = false,
  disabled = false,
  className = "",
  ...props
}) => {
  const [error, setError] = useState("")

  const handleChange = (e) => {
    let newValue = e.target.value

    // Aplicar formatação se especificada
    if (formatType && formatters[formatType]) {
      newValue = formatters[formatType](newValue)
    }

    // Validação
    if (validacao && validators[validacao]) {
      if (newValue && !validators[validacao](newValue)) {
        setError(`${label} inválido`)
      } else {
        setError("")
      }
    }

    // Validação obrigatória
    if (required && !newValue.trim()) {
      setError(`${label} é obrigatório`)
    } else if (!validacao) {
      setError("")
    }

    // Criar evento modificado
    const modifiedEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: newValue,
      },
    }

    onChange(modifiedEvent)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? "border-red-500" : ""}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default InputPadronizado
