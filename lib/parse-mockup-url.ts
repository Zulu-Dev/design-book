export type ParsedMockupUrl = {
  url: string;
  filename: string;
  lotId: string | null;
  designId: string | null;
  version: number | null;
};

const FILENAME_REGEX =
  /\/([^/?#]+)$/;

const DESIGN_REGEX =
  /(L\d+)[-_](D\d+)[-_]mockup[-_]V(\d+)\.(\w+)/i;

export function parseMockupUrl(url: string): ParsedMockupUrl {
  const trimmed = url.trim();
  const filenameMatch = trimmed.match(FILENAME_REGEX);
  const filename = filenameMatch?.[1] ?? trimmed;

  const designMatch = filename.match(DESIGN_REGEX);
  if (designMatch) {
    return {
      url: trimmed,
      filename,
      lotId: designMatch[1],
      designId: designMatch[2],
      version: Number.parseInt(designMatch[3], 10),
    };
  }

  return {
    url: trimmed,
    filename,
    lotId: null,
    designId: null,
    version: null,
  };
}
