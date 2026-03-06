import { TextDiffStrategy } from './text/myers'

const strategy = new TextDiffStrategy()

self.onmessage = (e: MessageEvent) => {
    const { source, target, requestId } = e.data
    try {
        const result = strategy.compute(source, target)
        self.postMessage({ requestId, result })
    } catch (error) {
        self.postMessage({ requestId, error: String(error) })
    }
}
