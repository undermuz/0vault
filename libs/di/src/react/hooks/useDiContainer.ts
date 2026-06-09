import { useContext } from "react"

import { DiContext } from "../di.context"

export const useDiContainer = () => {
    const di = useContext(DiContext)

    if (!di) {
        throw new Error("useDi must be used within a DiProvider")
    }

    return di
}
