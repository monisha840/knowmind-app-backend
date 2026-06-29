declare module 'docx-parser' {
  class DocxParser {
    parse(buffer: Buffer): Promise<any>
  }

  export = DocxParser
}
