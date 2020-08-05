import React from "react"
import { TodoTextInput } from "./TodoTextInput"
import { onNewTodo } from "../todos"

export const Header: React.FC = () => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput
      newTodo
      onSave={onNewTodo}
      placeholder="What needs to be done"
    />
  </header>
)
