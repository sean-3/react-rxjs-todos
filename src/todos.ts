import { Subject, concat, combineLatest, Observable, merge } from "rxjs";
import {
  scan,
  startWith,
  withLatestFrom,
  map,
  take,
  takeUntil,
  distinctUntilChanged,
  filter,
  pluck,
} from "rxjs/operators";
import { groupInMap, mergeWithKey } from "@josepot/rxjs-utils";
import {
  connectFactoryObservable,
  subjectFactory,
  shareLatest,
  connectObservable,
} from "react-rxjs";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const newTodo$ = new Subject<string>();
export const onNewTodo = (text: string) => newTodo$.next(text);

const toggleAll$ = new Subject();
export const onToggleAll = () => toggleAll$.next();

const clearCompleted$ = new Subject();
export const onClearCompleted = () => clearCompleted$.next();

const filterChanged$ = new Subject<"all" | "done" | "undone">();
export const onFilterChange = (type: "all" | "done" | "undone") =>
  filterChanged$.next(type);

export const [useCurrentFilter, currentFilter$] = connectObservable(
  filterChanged$.pipe(startWith("all" as const))
);

const textEdit$ = subjectFactory<number, string>();
export const onEditTodo = (id: number) => (text: string) =>
  textEdit$(id).next(text);

const toggle$ = subjectFactory<number, void>();
export const onToggleTodo = (id: number) => () => toggle$(id).next();

const delete$ = subjectFactory<number, void>();
export const onDeleteTodo = (id: number) => () => delete$(id).next();

const inc = (prev: number) => prev + 1;
const newId$ = newTodo$.pipe(
  filter((text) => text.length > 0),
  scan(inc, 0)
);

const todosMap$: Observable<Map<number, Todo>> = newId$.pipe(
  withLatestFrom(newTodo$),
  groupInMap(
    ([id]) => id,
    (newTodoWithId$) => {
      const id = newTodoWithId$.key;

      const initialText$ = newTodoWithId$.pipe(
        map(([, initialText]) => initialText),
        take(1)
      );
      const text$ = concat(
        initialText$,
        textEdit$(id).pipe(filter((text) => text.length > 0))
      );

      const done$ = mergeWithKey({ toggle: toggle$(id), set: setDone$ }).pipe(
        scan(
          (done, action) => (action.type === "set" ? action.payload : !done),
          false
        ),
        startWith(false),
        shareLatest()
      );

      const cleared$ = clearCompleted$.pipe(
        withLatestFrom(done$),
        filter(([, done]) => done)
      );
      const emptyTextUpdate$ = textEdit$(id).pipe(
        filter((text) => text.length === 0)
      );

      return combineLatest(text$, done$)
        .pipe(map(([text, done]) => ({ id, text, done })))
        .pipe(takeUntil(merge(delete$(id), cleared$, emptyTextUpdate$)));
    }
  ),
  startWith(new Map()),
  shareLatest()
);

export const [useTodo] = connectFactoryObservable((id: number) =>
  todosMap$.pipe(map((todos) => todos.get(id)!))
);

const todosList$ = todosMap$.pipe(
  map((todos) => [...todos.values()]),
  shareLatest()
);

const collectIds = (isMatch: (todo: Todo) => boolean = () => true) => (
  source$: Observable<Todo[]>
) =>
  source$.pipe(
    map((todos) => todos.filter(isMatch)),
    distinctUntilChanged((a, b) => a.length === b.length),
    map((todos) => todos.map((todo) => todo.id))
  );

const allIds$ = todosList$.pipe(collectIds());
export const [useIsListEmpty] = connectObservable(
  allIds$.pipe(map((ids) => ids.length === 0))
);

const completedIds$ = todosList$.pipe(collectIds(({ done }) => done));
const uncompletedIds$ = todosList$.pipe(collectIds(({ done }) => !done));

const setDone$ = toggleAll$.pipe(
  withLatestFrom(uncompletedIds$.pipe(map((x) => x.length > 0))),
  pluck(1),
  shareLatest()
);

export const [useAreAllDone] = connectObservable(
  combineLatest(allIds$, completedIds$).pipe(
    map(([all, completed]) => all.length === completed.length)
  )
);

export const [useActiveCount] = connectObservable(
  uncompletedIds$.pipe(pluck("length"))
);

export const [useUnActiveCount] = connectObservable(
  completedIds$.pipe(pluck("length"))
);

const ids$ = combineLatest(allIds$, completedIds$, uncompletedIds$).pipe(
  map(([all, done, undone]) => ({ all, done, undone })),
  shareLatest()
);

export const [useIds] = connectObservable(
  combineLatest(ids$, currentFilter$).pipe(map(([ids, filter]) => ids[filter]))
);
