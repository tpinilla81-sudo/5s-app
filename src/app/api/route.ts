import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";

export async function GET(request: NextRequest) {
  // If ?download=manual, serve the PDF
  const download = request.nextUrl.searchParams.get("download");
  if (download === "manual") {
    try {
      const buffer = await readFile("/home/z/my-project/download/Manual_Usuario_5S.pdf");
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="Manual_Usuario_5S.pdf"',
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ message: "Hello, world!" });
}
