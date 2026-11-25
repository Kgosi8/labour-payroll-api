import path from "node:path";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

// pdfmake 0.3 ships no usable types, so it is loaded untyped; definitions are still type-checked.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require("pdfmake");

const fontDir = path.join(
  path.dirname(require.resolve("pdfmake/package.json")),
  "fonts",
  "Roboto",
);
pdfmake.setFonts({
  Roboto: {
    normal: path.join(fontDir, "Roboto-Regular.ttf"),
    bold: path.join(fontDir, "Roboto-Medium.ttf"),
    italics: path.join(fontDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
  },
});

// Templates only use bundled fonts and canvas lines: refuse any other file or URL access.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((p: string) =>
  path.resolve(p).startsWith(fontDir),
);

export async function renderPdf(
  definition: TDocumentDefinitions,
): Promise<Buffer> {
  return Buffer.from(await pdfmake.createPdf(definition).getBuffer());
}
