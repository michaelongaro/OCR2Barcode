import JsBarcode from "jsbarcode";

export type InputType = "dpci" | "location";
export type ViewMode = "create" | "recent";
export type CustomKeyboardMode = "letters" | "numbers";

export interface StoredBarcode {
  id: string;
  type: InputType;
  data: string;
  timestamp: string;
  location?: string;
}

export const STORAGE_KEY = "bcg-generated-barcodes";

export const DPCI_KEYBOARD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export const LOCATION_LETTER_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["", "Z", "X", "C", "V", "B", "N", "M", ""],
  ["123", "", "⌫"],
];

export const LOCATION_NUMBER_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["ABC", "0", "⌫"],
];

export function getRawInputValue(value: string) {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

export function formatInput(value: string, type: InputType) {
  let cleaned = "";

  if (type === "dpci") {
    cleaned = value.replace(/\D/g, "").slice(0, 9);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }

    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  cleaned = value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 9);

  if (cleaned.length <= 3) {
    return cleaned;
  }

  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}

export function isValidInputValue(value: string, type: InputType) {
  const rawValue = getRawInputValue(value);

  if (type === "dpci") {
    return /^\d{9}$/.test(rawValue);
  }

  return rawValue.length === 9;
}

export function loadStoredBarcodes(storage: Storage = localStorage) {
  const stored = storage.getItem(STORAGE_KEY);

  if (!stored) {
    return [] as StoredBarcode[];
  }

  try {
    const parsed = JSON.parse(stored) as StoredBarcode[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredBarcodes(
  barcodes: StoredBarcode[],
  storage: Storage = localStorage,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(barcodes));
}

export function createStoredBarcode(
  type: InputType,
  data: string,
  pendingLocation: string | null,
): StoredBarcode {
  const barcode: StoredBarcode = {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: new Date().toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };

  if (type === "dpci" && pendingLocation) {
    barcode.location = pendingLocation;
  }

  return barcode;
}

export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  barcode: StoredBarcode,
) {
  JsBarcode(canvas, barcode.data, {
    format: "code39",
    displayValue: true,
    text: formatInput(barcode.data, barcode.type),
    fontOptions: "bold",
    textMargin: 0,
    fontSize: 18,
    margin: 7,
    marginLeft: 24,
    marginRight: 24,
    height: 75,
    width: 1.5,
  });
}
