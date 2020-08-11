import { Observable, GroupedObservable, Subject, defer } from "rxjs"
import {
  scan,
  mergeMap,
  ignoreElements,
  startWith,
  endWith,
  shareReplay,
  map,
  distinctUntilChanged,
  pairwise,
  filter,
  tap,
} from "rxjs/operators"
import { shareLatest } from "@react-rxjs/core"

export const split = <K, T, R>(
  keySelector: (value: T) => K,
  streamSelector: (grouped: Observable<T>, key: K) => Observable<R>,
) => (stream: Observable<T>) =>
  new Observable<GroupedObservable<K, R>>((subscriber) => {
    const groups: Map<K, Subject<T>> = new Map()

    return stream.subscribe(
      (x) => {
        const key = keySelector(x)
        if (groups.has(key)) {
          return groups.get(key)!.next(x)
        }

        const subject = new Subject<T>()
        groups.set(key, subject)

        const res = streamSelector(subject, key).pipe(
          shareReplay(1),
        ) as GroupedObservable<K, R>
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
        subscriber.error(e)
        /* istanbul ignore next */
        groups.forEach((g) => g.error(e))
      },
      () => {
        subscriber.complete()
        /* istanbul ignore next */
        groups.forEach((g) => g.complete())
      },
    )
  })

const scanWithStartingValue = <I, O>(
  accumulator: (acc: O, current: I) => O,
  getSeed: () => O,
) => (source: Observable<I>) =>
  defer(() => {
    const seed = getSeed()
    return source.pipe(scan(accumulator, seed), startWith(seed))
  })

export const collect = <K, T>() => (
  source$: Observable<GroupedObservable<K, T>>,
): Observable<Map<K, Observable<T>>> =>
  source$.pipe(
    mergeMap((inner$) =>
      inner$.pipe(ignoreElements(), startWith(inner$), endWith(inner$)),
    ),
    scanWithStartingValue(
      (acc, current) => {
        if (acc.has(current.key)) {
          acc.delete(current.key)
        } else {
          acc.set(current.key, current)
        }
        return acc
      },
      () => new Map<K, Observable<T>>(),
    ),
    shareLatest(),
  )

export const collectKeys = <K, T>(
  mapper: (source$: Observable<T>, key: K) => Observable<boolean>,
) => (source$: Observable<Map<K, Observable<T>>>): Observable<Set<K>> =>
  source$.pipe(
    map((m) => [...m.entries()]),
    startWith([] as [K, Observable<T>][]),
    pairwise(),
    filter(([a, b]) => b.length > a.length),
    map(([, b]) => b[b.length - 1]),
    tap(([key]) => console.log("key", key)),
    mergeMap(([key, inner$]) =>
      mapper(inner$, key).pipe(
        endWith(false),
        distinctUntilChanged(),
        map((value) => [key, value] as const),
      ),
    ),
    scanWithStartingValue(
      (acc, [key, present]) => {
        if (present) {
          acc.add(key)
        } else {
          acc.delete(key)
        }
        return acc
      },
      () => new Set<K>(),
    ),
    shareLatest(),
  )
