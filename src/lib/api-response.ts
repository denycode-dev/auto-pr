import { NextResponse } from "next/server";

export function apiSuccess<T>(
  data: T,
  message = "Operasi berhasil",
  metaExtra?: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        ...metaExtra,
      },
    },
    { status },
  );
}

export function apiError(message: string, code = "INTERNAL_SERVER_ERROR", details: unknown = [], status = 500) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        details: Array.isArray(details) ? details : [details],
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}
