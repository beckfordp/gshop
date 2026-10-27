// Extracts the server's `{"error": "..."}` message from a failed response,
// falling back when the body is missing or not JSON. Shared by the clients
// that surface server-side validation messages to the UI.
export async function serverErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
