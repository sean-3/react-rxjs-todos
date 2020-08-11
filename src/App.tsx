import React, { useState } from "react"
import { useTodos } from "./todos"
import { Header } from "./components/Header"
import { Main } from "./components/Main"
import { TodoList } from "./components/TodoList"

function App() {
  useTodos()
  return (
    <div>
      <Header />
      <Main>
        <TodoList />
      </Main>
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
