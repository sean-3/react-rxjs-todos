import React from "react"
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

export default App
