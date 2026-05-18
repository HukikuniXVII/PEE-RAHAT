import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";
const PARSE_TIMEOUT_MS = 60_000;
// 10 MB ceiling on what pdfplumber sees — admission criteria PDFs are
// usually < 1 MB; this just keeps runaway uploads from wasting subprocess
// time. The multipart limit at the controller is the first line of defense.
const MAX_STDOUT_BYTES = 10 * 1024 * 1024;

@Injectable()
export class TcasPdfParseService {
  private readonly logger = new Logger(TcasPdfParseService.name);

  async parsePdfToCsv(
    pdfBuffer: Buffer,
    meta: {
      university: string;
      round: string;
      admissionYear: number;
      sourceUrl?: string;
    },
  ): Promise<string> {
    const scriptPath = this.locateScript();
    const dir = await mkdtemp(join(tmpdir(), "tcas-pdf-"));
    const pdfPath = join(dir, "input.pdf");
    try {
      await writeFile(pdfPath, pdfBuffer);
      return await this.runPython([
        scriptPath,
        pdfPath,
        meta.university,
        meta.round,
        String(meta.admissionYear),
        meta.sourceUrl ?? "",
      ]);
    } finally {
      // Best-effort tempdir cleanup. If this fails we leak a few KB until
      // the OS rotates tmp; not worth surfacing as an error.
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private locateScript(): string {
    // Both `nest start` (cwd = apps/api) and `node dist/main.js` (also
    // cwd = apps/api in our deploy shape) leave scripts/ one level up
    // from the runtime cwd's source root.
    const candidates = [
      resolve(process.cwd(), "scripts", "parse_tcas_pdf.py"),
      resolve(__dirname, "..", "..", "..", "..", "scripts", "parse_tcas_pdf.py"),
      resolve(__dirname, "..", "..", "..", "scripts", "parse_tcas_pdf.py"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    throw new ServiceUnavailableException(
      "ไม่พบ parse_tcas_pdf.py — ตรวจสอบว่าไฟล์อยู่ที่ apps/api/scripts/",
    );
  }

  private runPython(args: string[]): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(PYTHON_BIN, args, { windowsHide: true });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let stdoutBytes = 0;
      let killed = false;

      const timeout = setTimeout(() => {
        killed = true;
        child.kill();
      }, PARSE_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          killed = true;
          child.kill();
          return;
        }
        stdoutChunks.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

      child.on("error", (err) => {
        clearTimeout(timeout);
        // Most common: PYTHON_BIN not installed / not on PATH.
        reject(
          new ServiceUnavailableException(
            `รัน Python ไม่สำเร็จ (${err.message}) — ติดตั้ง Python และ ` +
              `pip install -r apps/api/scripts/requirements.txt ` +
              `หรือ override PYTHON_BIN ใน apps/api/.env`,
          ),
        );
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
        if (stderrText) {
          // Python's stderr is the parser's progress channel — log it.
          this.logger.log(stderrText);
        }
        if (killed) {
          reject(
            new BadRequestException(
              `PDF parse เกินเวลา ${PARSE_TIMEOUT_MS / 1000}s — ลองไฟล์ที่เล็กกว่า`,
            ),
          );
          return;
        }
        if (code !== 0) {
          reject(
            new BadRequestException(
              `Python parser exit ${code}: ${stderrText || "(no stderr)"}`,
            ),
          );
          return;
        }
        resolvePromise(Buffer.concat(stdoutChunks).toString("utf8"));
      });
    });
  }
}
