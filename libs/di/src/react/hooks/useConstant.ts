import { useRef } from "react"

type ResultBox<T> = { v: T }

export default function useConstant<T>(fn: () => T): T {
    const ref = useRef<ResultBox<T>>(null)

    if (!ref.current) {
        // console.log(`[use-constant][initialize]`, { current: ref.current, fn })

        //@ts-ignore
        ref.current = { v: fn() }
    }

    return ref.current.v
}
