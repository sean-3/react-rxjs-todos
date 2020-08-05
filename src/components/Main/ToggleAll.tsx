import React from "react"
import { useAreAllDone, onToggleAll } from "../../todos"

export const ToggleAll: React.FC = () => {
  const areAllDone = useAreAllDone()
  return (
    <span>
      <input
        className="toggle-all"
        type="checkbox"
        checked={areAllDone}
        readOnly
      />
      <label onClick={onToggleAll} />
    </span>
  )
}
