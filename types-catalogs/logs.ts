/**
 * Functions that can be used to log messages during the processing
 * of an import or a publication.
 *
 * Functions list includes:
 * - info: Log a simple message.
 * - warning: Log a warning message.
 * - error: Log an error message.
 * - step: Create a new step in the log.
 * - task: Create a task, displaying a progress bar in the UI.
 * - progress: Update the progress of a task.
 */
export interface LogFunctions {
  /**
   * Log an simple message.
   * @param msg The message to log.
   * @param extra Additional information about the message.
   */
  info: (msg: string, extra?: any) => Promise<void>

  /**
   * Log a warning message. This is not an error but should be noted and
   * differentiated from a simple message.
   * @param msg The warning message.
   * @param extra Additional information about the warning.
   */
  warning: (msg: string, extra?: any) => Promise<void>

  /**
   * Log an error message.
   * @param msg The error message.
   * @param extra Additional information about the error.
   */
  error: (msg: string, extra?: any) => Promise<void>

  /**
   * Create a new step in the log. All subsequent logs will be associated with
   * this step until another step is created.
   * @param msg The title of the step.
   */
  step: (msg: string) => Promise<void>

  /**
   * Create a task, displaying a progress bar in the UI.
   * @param key The identifier for the task, used when updating progress.
   * @param msg The msg of the task.
   * @param total The maximum value the progress can reach.
   */
  task: (key: string, msg: string, total: number) => Promise<void>

  /**
   * Update the progress of a task.
   * @param taskKey The key of the task.
   * @param progress The current progress value of the task.
   * @param total The maximum value the progress can reach.
   */
  progress: (taskKey: string, progress: number, total?: number) => Promise<void>
}
