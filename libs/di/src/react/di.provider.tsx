"use client"

import type { ContainerModule } from "inversify"
import { FC, PropsWithChildren, useEffect, useState } from "react"

import { createDiContainer } from "../container"
import { I18nProvider, type I18nService } from "../i18n/types"
import { ThemeProvider, type ThemeService } from "../theme/types"
import {
    RecentFilesProviderToken,
    type IRecentFilesProvider,
} from "../recent-files/types"
import { LocalStorageProvider, type ILocalStorage } from "../utils/local-storage/types"

import { DiContext } from "./di.context"

import useConstant from "./hooks/useConstant"

type DiProviderProps = PropsWithChildren<{
    extraModules?: ContainerModule[]
}>

export const DiProvider: FC<DiProviderProps> = ({ children, extraModules = [] }) => {
    const di = useConstant(() => createDiContainer(extraModules))
    const [ready, setReady] = useState(false)
    const [bootError, setBootError] = useState<string | null>(null)

    useEffect(() => {
        void (async () => {
            try {
                const storage = di.get<ILocalStorage>(LocalStorageProvider)
                await storage.initialize({ prefix: "0vault:" })
                const i18n = di.get<I18nService>(I18nProvider)
                await i18n.initialize()
                const theme = di.get<ThemeService>(ThemeProvider)
                await theme.initialize()
                const recent = di.get<IRecentFilesProvider>(RecentFilesProviderToken)
                await recent.initialize()
                setReady(true)
            } catch (e) {
                const message =
                    e instanceof Error ? e.message : String(e)
                console.error("[DiProvider] bootstrap failed:", e)
                setBootError(message)
            }
        })()
    }, [di])

    if (bootError) {
        return (
            <pre className="m-4 whitespace-pre-wrap text-sm text-red-400">
                {`Bootstrap error:\n${bootError}\n\nOpen DevTools (see README) for the full stack trace.`}
            </pre>
        )
    }

    if (!ready) return null

    return <DiContext.Provider value={di}>{children}</DiContext.Provider>
}
