type Listener = (event: CustomEvent) => void;

class EventListener {
    private listenersMap: Map<string, Listener[]>;

    constructor() {
        this.listenersMap = new Map<string, Listener[]>();
    }

    addEventListener(type: string, listener: Listener): void {
        if (!this.listenersMap.has(type)) {
            this.listenersMap.set(type, []);
        }
        this.listenersMap.get(type)!.push(listener);
    }

    removeEventListener(type: string, listener: Listener): void {
        if (this.listenersMap.has(type)) {
            this.listenersMap.get(type)!.splice(this.listenersMap.get(type)!.indexOf(listener), 1);
        }
    }

    dispatchEvent(type: string, event: CustomEvent): void {
        if (this.listenersMap.has(type)) {
            this.listenersMap.get(type)!.forEach(listener => listener(event));
        }
    }

    clear(): void {
        this.listenersMap.clear();
    }
}

export { EventListener, type Listener };