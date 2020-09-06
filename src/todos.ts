import { Subject, Observable, merge, partition, GroupedObservable } from "rxjs"
import {
  pluck,
  mergeMap,
  map,
  scan,
  startWith,
  withLatestFrom,
  takeWhile,
  take,
  switchMap,
  share,
} from "rxjs/operators"
import { collect, mergeWithKey, split, selfDependant } from "@react-rxjs/utils"
import { bind } from "@react-rxjs/core"

export enum Filters {
  all = "all",
  active = "active",
  done = "done",
}
type Todo = { id: number; text: string; done: boolean }

const userAdd$ = new Subject<string>()
export const onNewTodo = (text: string) => text && userAdd$.next(text)

const userEdit$ = new Subject<{ id: number; text: string }>()
export const onEditTodo = (id: number, text: string) => {
  userEdit$.next({ id, text })
}

const userToggle$ = new Subject<number>()
export const onToggleTodo = (id: number) => () => userToggle$.next(id)

const toggleAll$ = new Subject()
export const onToggleAll = () => toggleAll$.next()

const userDelete$ = new Subject<number>()
export const onDeleteTodo = (id: number) => () => userDelete$.next(id)

const clearCompleted$ = new Subject()
export const onClearCompleted = () => clearCompleted$.next()

const filterChanged$ = new Subject<Filters>()
export const onFilterChange = (type: Filters) => filterChanged$.next(type)

const [edit$, emptyEdit$] = partition(userEdit$, ({ text }) => text.length > 0)

const [_doneTodos$, connectDoneTodos] = selfDependant<
  Map<number, GroupedObservable<number, Todo>>
>()
const [_activeTodos$, connectActiveTodos] = selfDependant<
  Map<number, GroupedObservable<number, Todo>>
>()

const deletions$: Observable<number> = merge(
  userDelete$,
  emptyEdit$.pipe(pluck("id")),
  clearCompleted$.pipe(
    withLatestFrom(_doneTodos$),
    mergeMap(([, done]) => done.keys()),
  ),
)

const toggles$: Observable<number> = merge(
  userToggle$,
  toggleAll$.pipe(
    withLatestFrom(_doneTodos$, _activeTodos$),
    mergeMap(([, done, active]) => (active.size > 0 ? active : done).keys()),
  ),
)

const splitTodos$ = mergeWithKey({
  add: userAdd$.pipe(map((text, id) => ({ id, text }))),
  edit: edit$,
  toggle: toggles$.pipe(map((id) => ({ id }))),
  delete: deletions$.pipe(map((id) => ({ id }))),
}).pipe(
  split(
    (x) => x.payload.id,
    (events$, id) =>
      events$.pipe(
        takeWhile((event) => event.type !== "delete"),
        scan(
          (state, action) => {
            switch (action.type) {
              case "add":
              case "edit":
                return { ...state, text: action.payload.text }
              case "toggle":
                return { ...state, done: !state.done }
              default:
                return state
            }
          },
          { id, text: "", done: false },
        ),
      ),
  ),
  share(),
)

const allTodos$ = splitTodos$.pipe(collect())
const activeTodos$ = splitTodos$.pipe(
  collect(map(({ done }) => !done)),
  connectActiveTodos(),
)
const doneTodos$ = splitTodos$.pipe(collect(pluck("done")), connectDoneTodos())

const todosByFilter = {
  [Filters.all]: allTodos$,
  [Filters.active]: activeTodos$,
  [Filters.done]: doneTodos$,
}

export const [useCurrentFilter, currentFilter$] = bind(
  filterChanged$.pipe(startWith(Filters.all)),
)

const [, currentTodos$] = bind(
  currentFilter$.pipe(switchMap((current) => todosByFilter[current])),
)

export const [useIds] = bind(
  currentTodos$.pipe(
    withLatestFrom(allTodos$),
    map(([current, all]) => [...all.keys()].filter((key) => current.has(key))),
  ),
)
export const [useTodo] = bind((id: number) =>
  currentTodos$.pipe(
    take(1),
    mergeMap((entries) => entries.get(id)!),
  ),
)
export const [useIsListEmpty] = bind(
  allTodos$.pipe(map((ids) => ids.size === 0)),
)
export const [useAreAllDone] = bind(
  activeTodos$.pipe(map((active) => active.size === 0)),
)
export const [useActiveCount] = bind(activeTodos$.pipe(pluck("size")))
export const [useAreAllActive] = bind(doneTodos$.pipe(map((x) => x.size === 0)))
