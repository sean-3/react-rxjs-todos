import { Observable, BehaviorSubject, GroupedObservable, Subject } from "rxjs"
import {
  finalize,
  scan,
  mergeMap,
  ignoreElements,
  startWith,
  endWith,
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

        const subject = new BehaviorSubject<T>(x)
        groups.set(key, subject)

        const res = streamSelector(subject, key).pipe(
          finalize(() => groups.delete(key)),
          shareLatest(),
        ) as GroupedObservable<K, R>
        res.key = key

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

export const groupInStreamMap = <K, T>() => (
  source$: Observable<GroupedObservable<K, T>>,
): Observable<Map<K, Observable<T>>> =>
  source$.pipe(
    mergeMap((inner$) =>
      inner$.pipe(ignoreElements(), startWith(inner$), endWith(inner$)),
    ),
    scan((acc, current) => {
      if (acc.has(current.key)) {
        acc.delete(current.key)
      } else {
        acc.set(current.key, current)
      }
      return acc
    }, new Map<K, Observable<T>>()),
  )
