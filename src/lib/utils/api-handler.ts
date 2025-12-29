import { NextResponse } from 'next/server';

type ApiHandler<T> = () => Promise<T>;

export async function apiHandler<T>(
  handler: ApiHandler<T>,
  errorMessage = 'Internal Server Error'
) {
  try {
    const result = await handler();
    return NextResponse.json(result);
  } catch (error) {
    console.error(errorMessage, error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
