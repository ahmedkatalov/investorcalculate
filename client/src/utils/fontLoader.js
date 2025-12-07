import { readFileSync } from "fs";
import path from "path";

export function loadFontBase64(filePath) {
  const fontPath = path.resolve(filePath);
  const buffer = readFileSync(fontPath);
  return buffer.toString("base64");
}
