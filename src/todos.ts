import { Subject, Observable, merge, partition } from "rxjs"
import {
  pluck,
  share,
  mergeMap,
  map,
  scan,
  startWith,
  switchMap,
  withLatestFrom,
  takeWhile,
  take,
  tap,
  mapTo,
} from "rxjs/operators"
import { useSubscribe, mergeWithKey } from "@react-rxjs/utils"
import { bind } from "@react-rxjs/core"
import { collect, collectKeys, split } from "./groupInStreamMap"

const userAdd$ = new Subject<string>()
export const onNewTodo = (text: string) => userAdd$.next(text)

const userEdit$ = new Subject<{ id: number; text: string }>()
export const onEditTodo = (id: number) => (text: string) => {
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

export enum Filters {
  all = "all",
  active = "active",
  done = "done",
}

const filterChanged$ = new Subject<Filters>()
export const onFilterChange = (type: Filters) => filterChanged$.next(type)

const newTodo$ = userAdd$.pipe(
  map((text, id) => ({ id, text })),
  share(),
)

const [edit$, emptyEdit$] = partition(userEdit$, ({ text }) => text.length > 0)

const _doneIds$ = new Subject<Set<number>>()
const _activeIds$ = new Subject<Set<number>>()

const deletions$: Observable<number> = merge(
  userDelete$,
  emptyEdit$.pipe(pluck("id")),
  clearCompleted$.pipe(
    withLatestFrom(_doneIds$),
    mergeMap(([, done]) => done),
  ),
).pipe(share())

const toggles$: Observable<number> = merge(
  userToggle$,
  toggleAll$.pipe(
    withLatestFrom(_doneIds$, _activeIds$),
    mergeMap(([, done, active]) => (active.size > 0 ? active : done)),
  ),
)

const todos$ = mergeWithKey({
  add: newTodo$,
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

const todosMap$ = todos$.pipe(collect())

const allIds$: Observable<Set<number>> = todosMap$.pipe(
  collectKeys((x) => x.pipe(mapTo(true))),
)

const activeIds$: Observable<Set<number>> = todosMap$.pipe(
  collectKeys((todo$) =>
    todo$.pipe(
      pluck("done"),
      map((done) => !done),
    ),
  ),
  tap(_activeIds$) as any,
)

const doneIds$: Observable<Set<number>> = todosMap$.pipe(
  collectKeys(pluck("done")),
  tap(_doneIds$) as any,
)

export const useTodos = () => {
  useSubscribe(todosMap$)
}

export const [useCurrentFilter, currentFilter$] = bind(
  filterChanged$.pipe(startWith(Filters.all)),
)

export const [useTodo] = bind((id: number) =>
  todosMap$.pipe(
    take(1),
    mergeMap((entries) => entries.get(id)!),
  ),
)

export const [useIsListEmpty] = bind(allIds$.pipe(map((ids) => ids.size === 0)))

export const [useAreAllDone] = bind(
  activeIds$.pipe(map((active) => active.size === 0)),
)

export const [useActiveCount] = bind(activeIds$.pipe(pluck("size")))

export const [useUnActiveCount] = bind(doneIds$.pipe(pluck("size")))

const idsByFilter: Record<Filters, Observable<Set<number>>> = {
  [Filters.all]: allIds$,
  [Filters.done]: doneIds$,
  [Filters.active]: activeIds$,
}

export const [useIds] = bind(
  currentFilter$.pipe(
    switchMap((type) => idsByFilter[type].pipe(map((ids) => [...ids]))),
  ),
)
