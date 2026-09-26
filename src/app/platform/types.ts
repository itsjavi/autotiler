import type { ExportFile } from "../../core/index.ts";

export interface SourceFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  /** platform reference used to re-read and watch the file (web: FileSystemFileHandle, desktop: path) */
  readonly ref?: unknown;
  /** human readable location, when known (desktop: absolute path) */
  readonly location?: string;
}

export interface OutputFolder {
  /** what to show in the UI */
  readonly label: string;
  /** platform reference (web: FileSystemDirectoryHandle, desktop: path) */
  readonly ref: unknown;
  /** absolute path, when the platform knows it */
  readonly path?: string;
}

export interface SaveResult {
  readonly kind: "downloaded" | "written";
  /** file or folder the user will find the result in */
  readonly where: string;
  /** a folder the user picked during this save, worth remembering for the next export */
  readonly folder?: OutputFolder;
}

export interface Platform {
  readonly kind: "web" | "desktop";
  /** can re-read the opened file when it changes on disk */
  readonly canWatch: boolean;
  /** can write straight into a folder (otherwise files are downloaded) */
  readonly canPickFolder: boolean;
  openImage: () => Promise<SourceFile | null>;
  /** re-opens a file by absolute path (desktop: recent files, restoring the last session) */
  openPath?: (path: string) => Promise<SourceFile>;
  fileFromDataTransfer: (dt: DataTransfer) => Promise<SourceFile | null>;
  /** native file drops (desktop); the web uses HTML5 drag and drop instead */
  subscribeNativeDrop?: (onFile: (file: SourceFile) => void, onHover: (over: boolean) => void) => Promise<() => void>;
  watch: (file: SourceFile, onChange: (file: SourceFile) => void) => (() => void) | null;
  pickOutputFolder: () => Promise<OutputFolder | null>;
  /** null when the user cancelled a dialog */
  save: (files: readonly ExportFile[], zipName: string, folder: OutputFolder | null) => Promise<SaveResult | null>;
  /** res:// path of `folder` when it is inside a Godot project */
  godotPathOf: (folder: OutputFolder) => Promise<string | null>;
  reveal?: (path: string) => Promise<void>;
  copyPng: (png: Uint8Array) => Promise<void>;
  openUrl: (url: string) => void;
  loadState: () => Promise<unknown>;
  saveState: (state: unknown) => Promise<void>;
}
