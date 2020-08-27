import React, { useState } from "react"
import classnames from "classnames"

export const TodoTextInput: React.FC<{
  onSave: (value: string) => void
  editing?: boolean
  initialText?: string
  newTodo?: boolean
  placeholder?: string
}> = ({ onSave, initialText, editing, newTodo, placeholder }) => {
  const [text, setText] = useState(initialText ?? "")

  return (
    <input
      className={classnames({
        edit: editing,
        "new-todo": newTodo,
      })}
      type="text"
      placeholder={placeholder}
      autoFocus={true}
      value={text}
      onBlur={(e) => {
        if (!newTodo) {
          onSave(e.target.value)
        }
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.which === 13) {
          onSave(text.trim())
          if (newTodo) {
            setText("")
          }
        }
      }}
    />
  )
}
