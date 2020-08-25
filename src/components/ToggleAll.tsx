import React from "react"
import { useAreAllDone, onToggleAll, useIsListEmpty } from "../todos"

export const ToggleAll: React.FC = () => {
  const isListEmpty = useIsListEmpty()
  const areAllDone = useAreAllDone()
  return isListEmpty ? null : (
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
