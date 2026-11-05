"use client";
/* eslint-disable @next/next/no-img-element -- Local previews and authenticated profile photos. */
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@/components/i18n";
import { Icon } from "@/components/icon";
import "@/app/profile-photo.css";

const PHOTO_DEBUG_VERSION = "simple-preview-debug-v1";
function photoLog(stage: string, details: Record<string, unknown> = {}) {
  console.log(`[CNX photo][${PHOTO_DEBUG_VERSION}] ${stage}`, details);
}
function fileDetails(file: File | undefined) {
  return file
    ? {
        name: file.name,
        type: file.type || "(empty MIME)",
        bytes: file.size,
        lastModified: file.lastModified,
      }
    : null;
}
function previewDetails(source: string | null | undefined) {
  return {
    present: Boolean(source),
    kind: source?.startsWith("data:")
      ? "data URL"
      : source?.startsWith("blob:")
        ? "blob URL"
        : "server URL",
    length: source?.length ?? 0,
  };
}

export function ProfilePhotoPicker({
  onChange,
  initialUrl,
  required = false,
  disabled = false,
}: {
  onChange: (file: File | null) => void;
  initialUrl?: string | null;
  required?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations(),
    id = useId();
  const input = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const selection = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false),
    [error, setError] = useState("");
  const displayed = preview ?? (cleared ? null : initialUrl);
  useEffect(() => {
    const field = input.current;
    if (field) field.dataset.photoReady = "true";
    const pendingSelection = selection;
    const nativeEvent = (event: Event) =>
      photoLog(`native:${event.type}`, {
        id: field?.id,
        disabled: field?.disabled,
        fileCount: field?.files?.length ?? 0,
        file: fileDetails(field?.files?.[0]),
      });
    const reset = () =>
      photoLog("native:form-reset", { selectedFile: fileDetails(field?.files?.[0]) });
    const policy = (event: SecurityPolicyViolationEvent) =>
      photoLog("browser:security-policy", {
        directive: event.violatedDirective,
        blockedScheme: event.blockedURI.split(":")[0],
        disposition: event.disposition,
      });
    photoLog("mounted", {
      origin: location.origin,
      path: location.pathname,
      inputId: field?.id,
      disabled: field?.disabled,
      fileReaderAvailable: typeof FileReader !== "undefined",
    });
    for (const event of ["click", "input", "change", "cancel"])
      field?.addEventListener(event, nativeEvent);
    const form = field?.form;
    form?.addEventListener("reset", reset);
    document.addEventListener("securitypolicyviolation", policy);
    return () => {
      if (field) field.dataset.photoReady = "false";
      photoLog("unmounted/refresh cleanup", {
        readerState: reader.current?.readyState,
      });
      pendingSelection.current++;
      reader.current?.abort();
      for (const event of ["click", "input", "change", "cancel"])
        field?.removeEventListener(event, nativeEvent);
      form?.removeEventListener("reset", reset);
      document.removeEventListener("securitypolicyviolation", policy);
    };
  }, []);
  useEffect(() => {
    photoLog("preview:rendered-state", {
      preview: previewDetails(preview),
      displayed: previewDetails(displayed),
      cleared,
      error: error || null,
    });
  }, [preview, displayed, cleared, error]);
  function choose(file: File | undefined) {
    photoLog("react:choose", { file: fileDetails(file) });
    if (!file) {
      photoLog("choose:no-file");
      return;
    }
    const token = ++selection.current;
    reader.current?.abort();
    setError("");
    const supported =
      ["image/jpeg", "image/jpg", "image/png"].includes(file.type) ||
      (!file.type && /\.(?:jpe?g|png)$/i.test(file.name));
    photoLog("validation", { token, supported, withinSizeLimit: file.size <= 5 * 1024 * 1024 });
    if (!supported || file.size > 5 * 1024 * 1024) {
      photoLog("validation:rejected", { token, file: fileDetails(file) });
      setError(t("Choisissez une photo JPG ou PNG de 5 Mo maximum."));
      if (input.current) input.current.value = "";
      return;
    }
    const next = new FileReader();
    reader.current = next;
    next.onloadstart = () => photoLog("reader:loadstart", { token });
    next.onprogress = (event) =>
      photoLog("reader:progress", { token, loaded: event.loaded, total: event.total });
    next.onabort = () => photoLog("reader:aborted", { token, activeSelection: selection.current });
    next.onloadend = () => photoLog("reader:loadend", { token, readyState: next.readyState });
    next.onload = () => {
      photoLog("reader:load", {
        token,
        activeSelection: selection.current,
        resultType: typeof next.result,
        preview: previewDetails(typeof next.result === "string" ? next.result : null),
      });
      if (token !== selection.current) {
        photoLog("reader:stale-result-ignored", { token });
        return;
      }
      if (typeof next.result !== "string") {
        setError(t("Impossible de lire cette photo."));
        return;
      }
      setPreview(next.result);
      setCleared(false);
      photoLog("parent:notify", { token, file: fileDetails(file) });
      onChange(file);
      photoLog("parent:notified", { token });
    };
    next.onerror = () => {
      photoLog("reader:error", { token, name: next.error?.name, message: next.error?.message });
      if (token === selection.current) setError(t("Impossible de lire cette photo."));
    };
    photoLog("reader:readAsDataURL", { token });
    try {
      next.readAsDataURL(file);
    } catch (failure) {
      photoLog("reader:exception", {
        token,
        message: failure instanceof Error ? failure.message : String(failure),
      });
      setError(t("Impossible de lire cette photo."));
    }
  }
  function remove() {
    photoLog("remove", { preview: previewDetails(preview), selection: selection.current });
    selection.current++;
    reader.current?.abort();
    setPreview(null);
    setCleared(true);
    setError("");
    onChange(null);
    if (input.current) input.current.value = "";
  }
  function imageFailed() {
    photoLog("image:error", { displayed: previewDetails(displayed) });
    remove();
    setError(t("Impossible d’afficher cette photo. Essayez une autre image JPG ou PNG."));
  }
  return (
    <div className="profile-photo-picker">
      <span className="profile-photo-label">
        {t("Photo de profil")}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <div className="profile-photo-controls">
        <label
          htmlFor={`${id}-file`}
          className="profile-photo-circle"
          onClick={() => photoLog("click:circle", { disabled, inputId: input.current?.id })}
          aria-disabled={disabled}
          aria-label={t(displayed ? "Changer la photo" : "Ajouter une photo")}
        >
          {displayed ? (
            <img
              src={displayed}
              alt={t("Votre photo de profil")}
              width={104}
              height={104}
              onLoad={(event) => {
                const image = event.currentTarget,
                  bounds = image.getBoundingClientRect(),
                  style = getComputedStyle(image);
                photoLog("image:loaded", {
                  naturalWidth: image.naturalWidth,
                  naturalHeight: image.naturalHeight,
                  renderedWidth: bounds.width,
                  renderedHeight: bounds.height,
                  display: style.display,
                  visibility: style.visibility,
                  opacity: style.opacity,
                });
              }}
              onError={imageFailed}
            />
          ) : (
            <Icon name="user" size={36} />
          )}
          <span className="profile-photo-edit" aria-hidden="true">
            <Icon name="image" size={14} />
          </span>
        </label>
        <div className="profile-photo-buttons">
          <label
            htmlFor={`${id}-file`}
            aria-disabled={disabled}
            onClick={() =>
              photoLog("click:add-or-change", { disabled, inputId: input.current?.id })
            }
          >
            {t(displayed ? "Changer la photo" : "Ajouter une photo")}
          </label>
          {displayed && (
            <button type="button" disabled={disabled} onClick={remove}>
              {t("Retirer")}
            </button>
          )}
          <small>{t("JPG ou PNG, 5 Mo maximum.")}</small>
        </div>
      </div>
      <input
        ref={input}
        id={`${id}-file`}
        name="profilePhoto"
        data-photo-version={PHOTO_DEBUG_VERSION}
        data-photo-ready="false"
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="profile-photo-input"
        aria-label={t("Choisir une photo de profil")}
        disabled={disabled}
        onInput={(event) =>
          photoLog("react:input", { file: fileDetails(event.currentTarget.files?.[0]) })
        }
        onChange={(event) => {
          photoLog("react:change", {
            fileCount: event.currentTarget.files?.length,
            file: fileDetails(event.currentTarget.files?.[0]),
          });
          choose(event.currentTarget.files?.[0]);
        }}
      />
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
