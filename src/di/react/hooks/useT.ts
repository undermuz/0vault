import { useEffect, useState } from "react"
import { type ServiceIdentifier } from "inversify"
import useConstant from "./useConstant"

import { useDi } from "./useDi"

type I18nLikeService = {
    t: (key: string, options?: Record<string, unknown>) => string
    onChange: (cb: () => void) => () => void
}

export const useT = <T extends I18nLikeService>(
    token: ServiceIdentifier<T>,
) => {
    const [, upd] = useState(0)

    const instance = useDi<T>(token)

    useEffect(() => {
        const unsubscribe = instance.onChange(() => {
            upd((_) => _ + 1)
        })

        return unsubscribe
    }, [instance])

    return useConstant(() => instance.t.bind(instance))
}
