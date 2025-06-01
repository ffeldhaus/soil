// Basic type declaration for selectable.js
declare module 'selectable.js' {
  interface SelectableOptions {
    filter?: string;
    appendTo?: HTMLElement | string;
    toggle?: boolean;
    lasso?: {
      borderColor?: string;
      backgroundColor?: string;
    };
    saveState?: boolean | number;
    ignore?: string[];
    autoScroll?: {
      threshold?: number;
      increment?: number;
    };
    throttle?: number;
    disabled?: boolean;
    // Add other options as needed based on the library's documentation
  }

  export interface SelectableNode {
    node: HTMLElement;
    // Add other properties of the selected item if available
  }

  class Selectable {
    constructor(options?: SelectableOptions);
    on(event: 'select', callback: (itemOrItems: SelectableNode | SelectableNode[]) => void): void;
    on(event: 'deselect', callback: (itemOrItems: SelectableNode | SelectableNode[]) => void): void;
    on(event: 'dragstart' | 'drag' | 'dragend' | 'init' | 'destroy' | 'enable' | 'disable', callback: (e?: unknown) => void): void;
    // Add other event types and methods as needed

    nodes: SelectableNode[];
    getSelectedNodes(): SelectableNode[];
    clear(): void;
    select(nodes: HTMLElement | HTMLElement[] | string): void;
    deselect(nodes: HTMLElement | HTMLElement[] | string): void;
    destroy(): void;
    enable(): void;
    disable(): void;
    // Add other methods from the library
  }

  export default Selectable;
}
