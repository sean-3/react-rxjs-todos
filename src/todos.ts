import { Subject, Observable, merge } from "rxjs"
import {
  pluck,
  share,
  mergeMap,
  map,
  filter,
  take,
  scan,
  startWith,
  takeUntil,
  mapTo,
  distinctUntilChanged,
  switchMap,
} from "rxjs/operators"
import { groupInMap, useSubscribe } from "@react-rxjs/utils"
import { bind, shareLatest } from "@react-rxjs/core"

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

const filterChanged$ = new Subject<"all" | "done" | "undone">()
export const onFilterChange = (type: "all" | "done" | "undone") =>
  filterChanged$.next(type)

const deletions$: Observable<number> = merge(
  userDelete$,
  userEdit$.pipe(
    filter((edit) => edit.text.length === 0),
    pluck("id"),
  ),
  clearCompleted$.pipe(
    mergeMap(() =>
      idsByDone$.pipe(
        take(1),
        mergeMap(({ done }) => done),
      ),
    ),
  ),
).pipe(share())

const toggles$: Observable<number> = merge(
  userToggle$,
  toggleAll$.pipe(
    mergeMap(() =>
      idsByDone$.pipe(
        take(1),
        mergeMap(({ done, pending }) => (pending.length > 0 ? pending : done)),
      ),
    ),
  ),
)

const takeWhileActive = <T>(id: number) => (source$: Observable<T>) =>
  source$.pipe(takeUntil(deletions$.pipe(filter((_id) => id === _id))))

const newTodo$ = userAdd$.pipe(
  map((text, id) => ({ text, id })),
  share(),
)

const text$ = merge(userEdit$, newTodo$).pipe(
  groupInMap(
    (x) => x.id,
    (edit$) =>
      edit$.pipe(
        pluck("text"),
        filter((text) => text.length > 0),
        takeWhileActive(edit$.key),
      ),
  ),
  shareLatest(),
)

const done$ = merge(newTodo$.pipe(pluck("id")), toggles$).pipe(
  groupInMap(
    (id) => id,
    (toggle$) =>
      toggle$.pipe(
        mapTo(false),
        scan((acc) => !acc),
        takeWhileActive(toggle$.key),
      ),
  ),
  shareLatest(),
)

const idsByDone$: Observable<{
  done: number[]
  pending: number[]
}> = done$.pipe(
  map((doneMap) => {
    const done: number[] = []
    const pending: number[] = []
    doneMap.forEach((isDone, id) => {
      ;(isDone ? done : pending).push(id)
    })
    return { done, pending }
  }),
  startWith({ done: [], pending: [] }),
  shareLatest(),
)

const allIds$: Observable<number[]> = text$.pipe(
  map((entries) => [...entries.keys()]),
  distinctUntilChanged((a, b) => a.length === b.length),
  startWith([]),
  shareLatest(),
)

export const useTodos = () => {
  useSubscribe(allIds$)
  useSubscribe(idsByDone$)
}

export const [useCurrentFilter, currentFilter$] = bind(
  filterChanged$.pipe(startWith("all" as const)),
)

export const [useTodoText] = bind((id: number) =>
  text$.pipe(map((entries) => entries.get(id)!)),
)

export const [useIsTodoCompleted] = bind((id: number) =>
  done$.pipe(map((entries) => entries.get(id)!)),
)

export const [useIsListEmpty] = bind(
  allIds$.pipe(map((ids) => ids.length === 0)),
)

export const [useAreAllDone] = bind(
  idsByDone$.pipe(map(({ pending }) => pending.length === 0)),
)

export const [useActiveCount] = bind(
  idsByDone$.pipe(pluck("pending", "length")),
)

export const [useUnActiveCount] = bind(idsByDone$.pipe(pluck("done", "length")))

const idsByFilter: Record<"all" | "done" | "undone", Observable<number[]>> = {
  all: allIds$,
  done: idsByDone$.pipe(pluck("done")),
  undone: idsByDone$.pipe(pluck("pending")),
}

export const [useIds] = bind(
  currentFilter$.pipe(switchMap((type) => idsByFilter[type])),
)
