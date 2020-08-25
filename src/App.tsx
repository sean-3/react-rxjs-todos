import React, { useState } from "react"
import { TodoList } from "./components/TodoList"
import { Footer } from "./components/Footer"
import { ToggleAll } from "./components/ToggleAll"
import { TodoTextInput } from "./components/TodoTextInput"
import { onNewTodo } from "./todos"

function App() {
  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        <TodoTextInput
          newTodo
          onSave={onNewTodo}
          placeholder="What needs to be done"
        />
      </header>
      <section className="main">
        <ToggleAll />
        <TodoList />
        <Footer />
      </section>
    </div>
  )
}

function RootApp() {
  const [active, setActive] = useState(true)
  return (
    <>
      <button onClick={() => setActive((x) => !x)}>main toggle</button>
      {active ? <App /> : null}
    </>
  )
}

export default RootApp
