export interface PaletteItem {
  hex: string;
  label: string;
  k2?: string;
  run: () => void;
}

export interface PaletteOptions {
  getItems: (query: string) => PaletteItem[];
  placeholder?: string;
  emptyText?: string;
  mount?: HTMLElement;
}

export interface PaletteHandle {
  open: () => void;
  close: () => void;
  destroy: () => void;
}

declare const UnsignedPalette: {
  init: (opts: PaletteOptions) => PaletteHandle;
};

export default UnsignedPalette;
