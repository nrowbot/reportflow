declare module 'papaparse' {
    export type ParseResult<T> = {
        data: T[]
        errors: Array<{ type: string; code: string; message: string }>
        meta: Record<string, unknown>
    }

    export type ParseConfig<T> = {
        header?: boolean
        dynamicTyping?: boolean
        complete?: (results: ParseResult<T>) => void
    }

    export type PapaParse = {
        parse<T>(file: File, config: ParseConfig<T>): void
    }

    const Papa: PapaParse
    export default Papa
}
