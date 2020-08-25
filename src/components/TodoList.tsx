import React, { memo, useState } from "react"
import classnames from "classnames"
import {
  useIds,
  useTodo,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
} from "../todos"
import { TodoTextInput } from "./TodoTextInput"

const TodoItem: React.FC<{ id: number }> = memo(({ id }) => {
  const { text, done } = useTodo(id)
  const [isEditing, setEditing] = useState(false)

  return (
    <li
      className={classnames({
        completed: done,
        editing: isEditing,
      })}
    >
      {isEditing ? (
        <TodoTextInput
          initialText={text}
          editing
          onSave={(text) => {
            setEditing(false)
            onEditTodo(id, text)
          }}
        />
      ) : (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={done}
            onChange={onToggleTodo(id)}
          />
          <label onDoubleClick={() => setEditing(true)}>{text}</label>
          <button className="destroy" onClick={onDeleteTodo(id)} />
        </div>
      )}
    </li>
  )
})

export const TodoList: React.FC = () => (
  <ul className="todo-list">
    {useIds().map((id) => (
      <TodoItem key={id} id={id} />
    ))}
  </ul>
)
