import { getLogger } from "@logtape/logtape"

import type { ILoggerSettings } from "../types"
import { ILogger } from "../../types/logger"

export const logTapeFactory = (
    name: string,
    _settings?: ILoggerSettings,
): ILogger => {
    const logger = getLogger(["di", name])

    return logger
}
