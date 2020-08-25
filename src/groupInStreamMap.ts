import {
  Observable,
  GroupedObservable,
  Subject,
  defer,
  ReplaySubject,
} from "rxjs"
import {
  scan,
  mergeMap,
  ignoreElements,
  startWith,
  endWith,
  shareReplay,
  map,
  distinctUntilChanged,
  skipWhile,
  publish,
  takeUntil,
  takeLast,
} from "rxjs/operators"
import { shareLatest } from "@react-rxjs/core"

const emptyError = {}

export function split<K, T>(
  keySelector: (value: T) => K,
): (stream: Observable<T>) => Observable<GroupedObservable<K, T>>

export function split<K, T, R>(
  keySelector: (value: T) => K,
  streamSelector: (grouped: Observable<T>, key: K) => Observable<R>,
): (stream: Observable<T>) => Observable<GroupedObservable<K, R>>

export function split<K, T, R>(
  keySelector: (value: T) => K,
  streamSelector?: (grouped: Observable<T>, key: K) => Observable<R>,
) {
  return (stream: Observable<T>) =>
    new Observable<GroupedObservable<K, R>>((subscriber) => {
      const groups: Map<K, Subject<T>> = new Map()

      let error = emptyError
      const sub = stream.subscribe(
        (x) => {
          const key = keySelector(x)
          if (groups.has(key)) {
            return groups.get(key)!.next(x)
          }

          const subject = streamSelector
            ? new Subject<T>()
            : new ReplaySubject<T>(1)
          groups.set(key, subject)

          const res = (streamSelector
            ? streamSelector(subject, key).pipe(shareReplay(1))
            : subject.asObservable()) as GroupedObservable<K, R>

          res.key = key
          res.subscribe({
            complete() {
              groups.delete(key)
            },
          })

          subject.next(x)
          subscriber.next(res)
        },
        (e) => {
          subscriber.error((error = e))
        },
        () => {
          subscriber.complete()
        },
      )

      return () => {
        sub.unsubscribe()
        groups.forEach(
          error === emptyError ? (g) => g.complete() : (g) => g.error(error),
        )
      }
    })
}

const defaultStart = <T>(value: T) => (source$: Observable<T>) =>
  new Observable<T>((observer) => {
    let emitted = false
    const subscription = source$.subscribe(
      (x) => {
        emitted = true
        observer.next(x)
      },
      (e) => observer.error(e),
      () => observer.complete(),
    )

    if (!emitted) {
      observer.next(value)
    }

    return subscription
  })

export const scanWithDefaultValue = <I, O>(
  accumulator: (acc: O, current: I) => O,
  getSeed: () => O,
) => (source: Observable<I>) =>
  defer(() => {
    const seed = getSeed()
    return source.pipe(scan(accumulator, seed), defaultStart(seed))
  })

const defaultFilter = (source$: Observable<any>) =>
  source$.pipe(ignoreElements(), startWith(true), endWith(false))

const set = "s" as const
const del = "d" as const
const complete = "c" as const

/**
 * A pipeable operator that collects all the GroupedObservables emitted by
 * the source and emits a Map with the active inner observables
 */
export const collect = <K, V>(
  filter?: (source$: GroupedObservable<K, V>) => Observable<boolean>,
) => {
  const enhancer = filter
    ? (source$: GroupedObservable<K, V>) =>
        filter(source$).pipe(
          endWith(false),
          skipWhile((x) => !x),
          distinctUntilChanged(),
        )
    : defaultFilter

  return (source$: Observable<GroupedObservable<K, V>>) =>
    source$.pipe(
      publish((multicasted$) =>
        multicasted$.pipe(
          mergeMap((o) => map((x) => ({ t: x ? set : del, o }))(enhancer(o))),
          takeUntil(takeLast(1)(multicasted$)),
        ),
      ),
      endWith({ t: complete }),
      scanWithDefaultValue(
        (acc, val) => {
          if (val.t === set) {
            acc.set(val.o.key, val.o)
          } else if (val.t === del) {
            acc.delete(val.o.key)
          } else {
            acc.clear()
          }
          return acc
        },
        () => new Map<K, GroupedObservable<K, V>>(),
      ),
      shareLatest(),
    )
}
