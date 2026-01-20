export class ToolError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'TOOL_EXECUTION_ERROR', details?: any) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
  }
}

export const handleError = (error: unknown): string => {
  if (error instanceof ToolError) {
    return `Error [${error.code}]: ${error.message}`;
  }
  if (error instanceof Error) {
    return `System Error: ${error.message}`;
  }
  return 'An unknown error occurred';
};