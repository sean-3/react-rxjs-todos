import React from "react"
import classnames from "classnames"
import {
  useActiveCount,
  useAreAllActive,
  useCurrentFilter,
  onFilterChange,
  onClearCompleted,
  Filters,
  useIsListEmpty,
} from "../todos"

const FILTER_TITLES: Record<Filters, string> = {
  [Filters.all]: "All",
  [Filters.active]: "Active",
  [Filters.done]: "Completed",
}

export const Footer: React.FC = () => {
  const activeCount = useActiveCount()
  const currentFilter = useCurrentFilter()
  const areAllActive = useAreAllActive()
  const isListEmpty = useIsListEmpty()
  return isListEmpty ? null : (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount || "No"}</strong>{" "}
        {activeCount === 1 ? "item" : "items"} left
      </span>
      <ul className="filters">
        {Object.entries(FILTER_TITLES).map(([filter, value]) => (
          <li key={filter}>
            <a
              className={classnames({ selected: currentFilter === filter })}
              style={{ cursor: "pointer" }}
              onClick={() => onFilterChange(filter as any)}
            >
              {value}
            </a>
          </li>
        ))}
      </ul>
      {areAllActive ? null : (
        <button className="clear-completed" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  )
}
