export function getSortedMapKeys(map: Map<string, unknown>): string[] {
    const keys: string[] = [];
    for (const key of map.keys()) {
        keys.push(key);
    }
    keys.sort();
    return keys;
}

export function removeHTMLElementChildren(element: HTMLElement): void {
    while (element.firstChild !== null) {
        element.firstChild.remove();
    }
}
