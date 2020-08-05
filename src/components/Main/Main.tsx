import React from "react"
import { useIsListEmpty } from "../../todos"
import { ToggleAll } from "./ToggleAll"
import { Footer } from "./Footer"

export const Main: React.FC = ({ children }) => {
  const isListEmpty = useIsListEmpty()
  return (
    <section className="main">
      {isListEmpty ? null : <ToggleAll />}
      {children}
      {isListEmpty ? null : <Footer />}
    </section>
  )
}
