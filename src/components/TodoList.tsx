import React, { useState, useEffect } from "react"
import classnames from "classnames"
import {
  useIds,
  useTodoText,
  useIsTodoCompleted,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
} from "../todos"
import { TodoTextInput } from "./TodoTextInput"

const TodoItem: React.FC<{ id: number }> = ({ id }) => {
  const [isEditing, setEditing] = useState(false)
  const text = useTodoText(id)
  const done = useIsTodoCompleted(id)

  useEffect(() => {
    setEditing(false)
  }, [text])

  return (
    <li
      className={classnames({
        completed: done,
        editing: isEditing,
      })}
    >
      {isEditing ? (
        <TodoTextInput initialText={text} editing onSave={onEditTodo(id)} />
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
}

export const TodoList: React.FC = () => (
  <ul className="todo-list">
    {useIds().map((id) => (
      <TodoItem key={id} id={id} />
    ))}
  </ul>
)
