/**
 * Represents a single part of a multipart form-data request
 */
export interface MultipartPart {
  /** Name of the form field */
  name: string;
  /** Original filename from the client */
  filename: string;
  /** Raw binary file data */
  data: Buffer;
}

/**
 * Parses multipart/form-data request body into individual file parts
 * @param body - Raw request body buffer containing multipart data
 * @param boundary - Multipart boundary string from Content-Type header
 * @returns Array of parsed multipart parts containing file metadata and data
 */
export function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
  let start = 0;
  let end = body.indexOf(boundaryBuffer, start);

  while (end !== -1) {
    const partStart = end + boundaryBuffer.length;
    let partEnd = body.indexOf(boundaryBuffer, partStart);

    if (partEnd === -1) {
      const endBoundaryIndex = body.indexOf(endBoundaryBuffer, partStart);
      if (endBoundaryIndex !== -1) {
        partEnd = endBoundaryIndex;
      } else {
        break;
      }
    }

    const part = body.subarray(partStart, partEnd);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString();
      const data = part.subarray(headerEnd + 4);
      const headerLines = headers.split('\r\n');
      const contentDisposition = headerLines.find((line: string) => line.startsWith('Content-Disposition'));
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const nameMatch = contentDisposition.match(/name="([^"]+)"/);
        if (filenameMatch && nameMatch) {
          parts.push({
            name: nameMatch[1],
            filename: filenameMatch[1],
            data: data
          });
        }
      }
    }

    if (partEnd === body.indexOf(endBoundaryBuffer, partStart)) {
      break;
    }

    start = partEnd;
    end = body.indexOf(boundaryBuffer, start);
  }
  return parts;
}