import React, {useState, useEffect} from "react";
import classnames from "classnames";
import {
  onNewTodo,
  useIsListEmpty,
  useAreAllDone,
  useActiveCount,
  useCurrentFilter,
  onFilterChange,
  useUnActiveCount,
  onClearCompleted,
  useIds,
  useTodo,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
  onToggleAll,
  todos$,
} from "./todos";
import {Subscribe} from "@react-rxjs/utils";

const TodoTextInput: React.FC<{
  onSave: (value: string) => void;
  editing?: boolean;
  initialText?: string;
  newTodo?: boolean;
  placeholder?: string;
}> = ({onSave, initialText, editing, newTodo, placeholder}) => {
  const [text, setText] = useState(initialText ?? "");

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
          onSave(e.target.value);
        }
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.which === 13) {
          onSave(text.trim());
          if (newTodo) {
            setText("");
          }
        }
      }}
    />
  );
};

const Header: React.FC = () => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput
      newTodo
      onSave={onNewTodo}
      placeholder="What needs to be done"
    />
  </header>
);

const ToggleAll: React.FC = () => {
  const areAllDone = useAreAllDone();
  return (
    <span>
      <input
        className="toggle-all"
        type="checkbox"
        checked={areAllDone}
        readOnly
      />
      <label onClick={onToggleAll} />
    </span>
  );
};

const FILTER_TITLES: Record<"all" | "done" | "undone", string> = {
  all: "All",
  undone: "Active",
  done: "Completed",
};

const Footer: React.FC = () => {
  const activeCount = useActiveCount();
  const itemWord = activeCount === 1 ? "item" : "items";
  const currentFilter = useCurrentFilter();
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount || "No"}</strong> {itemWord} left
      </span>
      <ul className="filters">
        {Object.entries(FILTER_TITLES).map(([filter, value]) => (
          <li key={filter}>
            <a
              className={classnames({selected: currentFilter === filter})}
              style={{cursor: "pointer"}}
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
  );
};

const TodoItem: React.FC<{id: number}> = ({id}) => {
  const [isEditing, setEditing] = useState(false);
  const {text, done} = useTodo(id);

  useEffect(() => {
    setEditing(false);
  }, [text]);

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
  );
};

const List: React.FC = () => (
  <ul className="todo-list">
    {useIds().map((id) => (
      <TodoItem key={id} id={id} />
    ))}
  </ul>
);

const MainSection: React.FC = ({children}) => {
  const isListEmpty = useIsListEmpty();
  return (
    <section className="main">
      {isListEmpty ? null : <ToggleAll />}
      {children}
      {isListEmpty ? null : <Footer />}
    </section>
  );
};

function App() {
  return (
    <div>
      <Header />
      <MainSection>
        <Subscribe source$={todos$} />
        <List />
      </MainSection>
    </div>
  );
}

export default App;
