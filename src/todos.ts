import {Subject, combineLatest, Observable, merge, of, MonoTypeOperatorFunction} from "rxjs";
import {
  startWith,
  withLatestFrom,
  map,
  take,
  distinctUntilChanged,
  filter,
  pluck,
  share,
  mergeMap,
  tap,
  takeWhile,
} from "rxjs/operators";
import {groupInMap} from "@react-rxjs/utils";
import {
  bind,
  shareLatest,
} from "@react-rxjs/core";

const userAdd$ = new Subject<string>();
export const onNewTodo = (text: string) => userAdd$.next(text);

const userEdit$ = new Subject<{id: number, text: string}>()
export const onEditTodo = (id: number) => (text: string) => {
  userEdit$.next({id, text})
}

const userDelete$ = new Subject<number>();
export const onDeleteTodo = (id: number) => () => userDelete$.next(id);

const additions$: Observable<{id: number, text: string}> = userAdd$.pipe(
  map((text, id) => ({id, text})),
  share()
)

const id$ = additions$.pipe(pluck('id'), share());

const _completed$ = new Subject<number[]>()
const _uncompleted$ = new Subject<number[]>()

const clearCompleted$ = new Subject();
export const onClearCompleted = () => clearCompleted$.next();

const deletions$: Observable<number> = merge(
  userDelete$,
  userEdit$.pipe(filter(({text}) => text.length === 0), pluck('id')),
  clearCompleted$.pipe(
    withLatestFrom(_completed$),
    pluck(1),
    mergeMap(completed => completed)
  ),
).pipe(share())

const allIds$: Observable<number[]> = merge(id$, deletions$).pipe(
  groupInMap(id => id, id$ => id$.pipe(take(2))),
  map(x => [...x.keys()]),
  startWith([]),
  shareLatest()
)

const userToggle$ = new Subject<number>();
export const onToggleTodo = (id: number) => () => userToggle$.next(id);

const toggleAll$ = new Subject();
export const onToggleAll = () => toggleAll$.next();

const toggle$: Observable<number> = merge(
  userToggle$,
  toggleAll$.pipe(
    withLatestFrom(_uncompleted$, allIds$),
    mergeMap(([_, uncompleted, allIds]) => uncompleted.length === 0 ? allIds : uncompleted)
  ),
).pipe(share())

const reducePrev = <A, C>(
  prev$: Observable<A>,
  reducer: (acc: A, current: C) => A
) => (source$: Observable<C>): Observable<A> => source$.pipe(
  withLatestFrom(prev$),
  map(([current, acc]) => reducer(acc, current))
)

const uncompleted$ = merge(
  id$.pipe(reducePrev(_uncompleted$, (acc, id) => [...acc, id])),
  toggle$.pipe(reducePrev(_uncompleted$, (acc, id) => acc.includes(id) ? acc.filter(x => x !== id) : [...acc, id])),
  deletions$.pipe(reducePrev(_uncompleted$, (acc, id) => acc.includes(id) ? acc.filter(x => x !== id) : acc)),
  of([])
).pipe(
  distinctUntilChanged(),
  tap(_uncompleted$) as MonoTypeOperatorFunction<number[]>,
  shareLatest()
)

const completed$ = merge(
  toggle$.pipe(reducePrev(_completed$, (acc, id) => acc.includes(id) ? acc.filter(x => x !== id) : [...acc, id])),
  deletions$.pipe(reducePrev(_completed$, (acc, id) => acc.includes(id) ? acc.filter(x => x !== id) : acc)),
  of([])
).pipe(
  distinctUntilChanged(),
  tap(_completed$) as MonoTypeOperatorFunction<number[]>,
  shareLatest()
)

export const todos$ = merge(
  additions$,
  userEdit$.pipe(filter(todo => todo.text.length > 0)),
  deletions$.pipe(map(id => ({id, text: ''})))
).pipe(
  groupInMap(
    todo => todo.id,
    todo$ => todo$.pipe(takeWhile(todo => todo.text.length > 0))
  ),
  shareLatest()
)

const filterChanged$ = new Subject<"all" | "done" | "undone">();
export const onFilterChange = (type: "all" | "done" | "undone") =>
  filterChanged$.next(type);

export const [useCurrentFilter, currentFilter$] = bind(
  filterChanged$.pipe(startWith("all" as const))
);

export const [useTodo] = bind((id: number) => combineLatest(
  todos$.pipe(map(todos => todos.get(id)!)),
  completed$.pipe(map(completed => completed.includes(id)), distinctUntilChanged())
).pipe(
  map(([todo, done]) => ({...todo, done}))
))

export const [useIsListEmpty] = bind(
  allIds$.pipe(map((ids) => ids.length === 0))
);

export const [useAreAllDone] = bind(
  combineLatest(allIds$, completed$).pipe(
    map(([all, completed]) => all.length === completed.length)
  )
);

export const [useActiveCount] = bind(
  uncompleted$.pipe(pluck("length"))
);

export const [useUnActiveCount] = bind(
  completed$.pipe(pluck("length"))
);

const ids$ = combineLatest(allIds$, completed$, uncompleted$).pipe(
  map(([all, done, undone]) => ({all, done, undone})),
);

export const [useIds] = bind(
  combineLatest(ids$, currentFilter$).pipe(map(([ids, filter]) => ids[filter]))
);
