"use client";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type FormEvent,
} from "react";
import { useTranslations } from "@/components/i18n";
import "@/app/image-upload.css";

export type UploadedProjectImage = {
  id: string;
  fullUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};
type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: (image: UploadedProjectImage) => void;
};
const MAX_BYTES = 5 * 1024 * 1024;
const subscribeToClient = () => () => {};
const invalidMessage = "Choisissez une image JPG, PNG ou WebP valide.";
const genericMessage = "L’image n’a pas pu être enregistrée. Réessayez.";
function imageResponse(value: unknown): value is { image: UploadedProjectImage } {
  if (!value || typeof value !== "object" || !("image" in value)) return false;
  const image = value.image;
  if (!image || typeof image !== "object") return false;
  return (
    "id" in image &&
    typeof image.id === "string" &&
    /^[a-f0-9-]{36}$/i.test(image.id) &&
    "fullUrl" in image &&
    image.fullUrl === `/api/project-images/${image.id}/full` &&
    "thumbnailUrl" in image &&
    image.thumbnailUrl === `/api/project-images/${image.id}/thumbnail` &&
    "width" in image &&
    typeof image.width === "number" &&
    image.width > 0 &&
    "height" in image &&
    typeof image.height === "number" &&
    image.height > 0
  );
}
export function ImageUploadModal({ open, onClose, onUploaded }: Props) {
  const t = useTranslations();
  const titleId = useId();
  const helpId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const portalRoot = mounted ? document.body : null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      chooseRef.current?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open, portalRoot]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);
  function clearSelection() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFile(null);
    setPreview(null);
    setError(null);
    setProgress(0);
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }
  function close() {
    if (!pending) {
      clearSelection();
      onClose();
    }
  }
  function selectFile(next: File | undefined) {
    if (pending || !next) return;
    setError(null);
    if (!next.size || !["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError(invalidMessage);
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("L’image ne doit pas dépasser 5 Mo.");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(next);
    urlRef.current = url;
    setFile(next);
    setPreview(url);
    setProgress(0);
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Choisissez une seule image.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) return;
    const form = new FormData();
    form.set("image", file);
    const request = new XMLHttpRequest();
    requestRef.current = request;
    setPending(true);
    setProgress(0);
    setError(null);
    const failed = (message: string) => {
      if (mountedRef.current) {
        setPending(false);
        setError(message);
      }
    };
    request.upload.onprogress = (event) => {
      if (mountedRef.current && event.lengthComputable)
        setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      if (!mountedRef.current) return;
      let body: unknown;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        failed(genericMessage);
        return;
      }
      if (request.status >= 200 && request.status < 300 && imageResponse(body)) {
        setPending(false);
        clearSelection();
        onUploaded(body.image);
        onClose();
      } else {
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : genericMessage;
        failed(message);
      }
    };
    request.onerror = () => failed(genericMessage);
    request.ontimeout = () => failed("L’envoi a pris trop de temps. Réessayez.");
    request.onabort = () => failed(genericMessage);
    request.open("POST", "/api/project-images/upload");
    request.timeout = 60000;
    request.send(form);
  }
  if (!portalRoot) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className="image-upload-modal"
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form onSubmit={upload} className="image-upload-panel">
        <header className="image-upload-header">
          <div>
            <h2 id={titleId}>{t("Image du projet")}</h2>
            <p id={helpId}>{t("Ajoutez une image ou le logo de votre projet.")}</p>
          </div>
          <button
            type="button"
            className="image-upload-close"
            aria-label={t("Fermer")}
            disabled={pending}
            onClick={close}
          >
            ×
          </button>
        </header>
        <div
          className={
            "image-upload-dropzone" +
            (dragging ? " is-dragging" : "") +
            (preview ? " has-preview" : "")
          }
          onDragOver={(event) => {
            event.preventDefault();
            if (!pending) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDragging(false);
          }}
          onDrop={drop}
        >
          {preview ? (
            <div className="image-upload-preview">
              <Image
                src={preview}
                alt={t("Aperçu de l’image")}
                fill
                unoptimized
                sizes="(max-width: 680px) 90vw, 600px"
              />
            </div>
          ) : (
            <div className="image-upload-empty">
              <svg
                viewBox="0 0 48 48"
                width="46"
                height="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                aria-hidden="true"
              >
                <rect x="5" y="7" width="38" height="34" rx="5" />
                <circle cx="16" cy="17" r="4" />
                <path d="m7 35 11-10 8 7 7-9 9 12" />
              </svg>
              <strong>{t("Glissez votre image ici")}</strong>
              <span>{t("JPG, PNG ou WebP · 5 Mo maximum")}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={pending}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <button
            ref={chooseRef}
            type="button"
            className="image-upload-choose"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {t(preview ? "Choisir une autre image" : "Sélectionner une image")}
          </button>
        </div>
        {file && <p className="image-upload-filename">{file.name}</p>}
        {pending && (
          <div className="image-upload-progress" role="status">
            <span>{t(progress === 100 ? "Préparation de l’image…" : "Envoi de l’image…")}</span>
            <progress value={progress} max={100} aria-label={t("Progression de l’envoi")} />
          </div>
        )}
        {error && (
          <p className="image-upload-error" role="alert">
            {t(error)}
          </p>
        )}
        <footer className="image-upload-footer">
          <button type="button" className="image-upload-cancel" disabled={pending} onClick={close}>
            {t("Annuler")}
          </button>
          <button type="submit" className="image-upload-confirm" disabled={!file || pending}>
            {t(pending ? "Envoi en cours…" : "Utiliser cette image")}
          </button>
        </footer>
      </form>
    </dialog>,
    portalRoot,
  );
}
