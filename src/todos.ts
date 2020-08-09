import { Subject, Observable, merge, defer, combineLatest } from "rxjs"
import {
  pluck,
  share,
  mergeMap,
  map,
  filter,
  scan,
  startWith,
  switchMap,
  withLatestFrom,
  takeWhile,
  mapTo,
  skip,
  take,
} from "rxjs/operators"
import { useSubscribe, mergeWithKey } from "@react-rxjs/utils"
import { bind, shareLatest } from "@react-rxjs/core"
import { groupInStreamMap, split } from "./groupInStreamMap"

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

const deletions$: Observable<number> = merge(
  userDelete$,
  userEdit$.pipe(
    filter((edit) => edit.text.length === 0),
    pluck("id"),
  ),
  clearCompleted$.pipe(
    withLatestFrom(defer(() => doneIds$)),
    mergeMap(([, done]) => done),
  ),
).pipe(share())

const toggles$: Observable<number> = merge(
  userToggle$,
  toggleAll$.pipe(
    withLatestFrom(defer(() => combineLatest(doneIds$, activeIds$))),
    mergeMap(([, [done, active]]) => (active.size > 0 ? active : done)),
  ),
)

const text$Map$ = merge(
  userEdit$,
  newTodo$,
  deletions$.pipe(map((id) => ({ id, text: "" }))),
).pipe(
  split(
    ({ id }) => id,
    (text$) =>
      text$.pipe(
        pluck("text"),
        takeWhile((text) => text.length > 0),
      ),
  ),
  groupInStreamMap(),
  shareLatest(),
)

const done$$ = mergeWithKey({
  toggle: merge(newTodo$.pipe(pluck("id")), toggles$),
  delete: deletions$,
}).pipe(
  split(
    ({ payload }) => payload,
    (toggle$) =>
      toggle$.pipe(
        takeWhile(({ type }) => type === "toggle"),
        scan((acc) => !acc, true),
      ),
  ),
  share(),
)

const done$Map$ = done$$.pipe(groupInStreamMap(), shareLatest())

const activeIds$: Observable<Set<number>> = mergeWithKey({
  delete: deletions$.pipe(
    withLatestFrom(defer(() => activeIds$)),
    filter(([id, ids]) => ids.has(id)),
    pluck(0),
  ),
  done: done$$.pipe(mergeMap((done$) => done$.pipe(mapTo(done$.key)))),
}).pipe(
  scan((acc, { type, payload }) => {
    if (type === "delete" || acc.has(payload)) {
      acc.delete(payload)
    } else {
      acc.add(payload)
    }
    return acc
  }, new Set<number>()),
  startWith(new Set<number>()),
  shareLatest(),
)

const doneIds$: Observable<Set<number>> = mergeWithKey({
  delete: deletions$.pipe(
    withLatestFrom(defer(() => doneIds$)),
    filter(([id, ids]) => ids.has(id)),
    pluck(0),
  ),
  done: done$$.pipe(mergeMap((done$) => done$.pipe(skip(1), mapTo(done$.key)))),
}).pipe(
  scan((acc, { type, payload }) => {
    if (type === "delete" || acc.has(payload)) {
      acc.delete(payload)
    } else {
      acc.add(payload)
    }
    return acc
  }, new Set<number>()),
  startWith(new Set<number>()),
  shareLatest(),
)

const allIds$: Observable<number[]> = text$Map$.pipe(
  map((entries) => [...entries.keys()]),
  startWith([]),
  shareLatest(),
)

export const useTodos = () => {
  useSubscribe(merge(done$Map$, text$Map$, doneIds$, activeIds$))
}

export const [useCurrentFilter, currentFilter$] = bind(
  filterChanged$.pipe(startWith(Filters.all)),
)

export const [useTodoText] = bind((id: number) =>
  text$Map$.pipe(
    take(1),
    mergeMap((entries) => entries.get(id)!),
  ),
)

export const [useIsTodoCompleted] = bind((id: number) =>
  done$Map$.pipe(
    take(1),
    mergeMap((entries) => entries.get(id)!),
  ),
)

export const [useIsListEmpty] = bind(
  allIds$.pipe(map((ids) => ids.length === 0)),
)

export const [useAreAllDone] = bind(
  activeIds$.pipe(map((active) => active.size === 0)),
)

export const [useActiveCount] = bind(activeIds$.pipe(pluck("size")))

export const [useUnActiveCount] = bind(doneIds$.pipe(pluck("size")))

const idsByFilter: Record<Filters, Observable<number[]>> = {
  [Filters.all]: allIds$,
  [Filters.done]: doneIds$.pipe(map((ids) => [...ids])),
  [Filters.active]: activeIds$.pipe(map((ids) => [...ids])),
}

export const [useIds] = bind(
  currentFilter$.pipe(switchMap((type) => idsByFilter[type])),
)
