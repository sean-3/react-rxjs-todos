import React from "react"
import classnames from "classnames"
import {
  useActiveCount,
  useUnActiveCount,
  useCurrentFilter,
  onFilterChange,
  onClearCompleted,
  Filters,
} from "../../todos"

const FILTER_TITLES: Record<Filters, string> = {
  [Filters.all]: "All",
  [Filters.active]: "Active",
  [Filters.done]: "Completed",
}

export const Footer: React.FC = () => {
  const activeCount = useActiveCount()
  const itemWord = activeCount === 1 ? "item" : "items"
  const currentFilter = useCurrentFilter()
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount || "No"}</strong> {itemWord} left
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
      {useUnActiveCount() === 0 ? null : (
        <button className="clear-completed" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  )
}
