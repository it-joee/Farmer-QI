import { useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "../lib/photos";
import { createCapturedPhoto, revokeCapturedPhoto } from "../lib/photos";

interface PhotoCaptureFieldProps {
  label: string;
  hint?: string;
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  multiple?: boolean;
  maxPhotos?: number;
}

export function PhotoCaptureField({
  label,
  hint,
  photos,
  onChange,
  multiple = false,
  maxPhotos = 4,
}: PhotoCaptureFieldProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewingPhoto, setViewingPhoto] = useState<CapturedPhoto | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    if (!cameraOpen) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      setCameraError("");
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera is not supported on this device.");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError("Could not access the camera. Check permissions or use upload instead.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraOpen, facingMode]);

  function addPhoto(file: File) {
    const next = createCapturedPhoto(file);

    if (replaceId) {
      const updated = photos.map((p) => {
        if (p.id === replaceId) {
          revokeCapturedPhoto(p);
          return next;
        }
        return p;
      });
      onChange(updated);
      setReplaceId(null);
      return;
    }

    if (multiple) {
      onChange([...photos, next].slice(0, maxPhotos));
    } else {
      if (photos[0]) revokeCapturedPhoto(photos[0]);
      onChange([next]);
    }
  }

  function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    addPhoto(fileList[0]);
  }

  function openUploadPicker(id: string | null = null) {
    setReplaceId(id);
    uploadInputRef.current?.click();
  }

  function openCamera(id: string | null = null) {
    setReplaceId(id);
    setCameraError("");
    setFacingMode("environment");
    setCameraOpen(true);
  }

  function closeCamera() {
    setCameraOpen(false);
    setReplaceId(null);
    setFacingMode("environment");
  }

  function switchCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        addPhoto(file);
        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function removePhoto(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo) revokeCapturedPhoto(photo);
    onChange(photos.filter((p) => p.id !== id));
  }

  const canAddMore = multiple ? photos.length < maxPhotos : photos.length === 0;
  const fieldClass = [
    "photo-field",
    multiple ? "photo-field--gallery" : "photo-field--single",
  ].join(" ");

  return (
    <div className={fieldClass}>
      <span className="field-label">{label}</span>
      {hint && <p className="field-hint">{hint}</p>}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleUpload(e.target.files);
          e.target.value = "";
        }}
      />

      <canvas ref={canvasRef} className="sr-only" />

      {photos.length > 0 && (
        <div className={`photo-grid${multiple ? " photo-grid--gallery" : ""}`}>
          {photos.map((photo) => (
            <div key={photo.id} className="photo-card">
              <button
                type="button"
                className="photo-card__image-btn"
                onClick={() => setViewingPhoto(photo)}
                aria-label="View photo full size"
              >
                <img src={photo.previewUrl} alt="" className="photo-card__image" />
              </button>
              <div className="photo-card__actions">
                <button
                  type="button"
                  className="btn btn-secondary photo-card__action"
                  onClick={() => setViewingPhoto(photo)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="btn btn-secondary photo-card__action"
                  onClick={() => openCamera(photo.id)}
                >
                  Retake
                </button>
                <button
                  type="button"
                  className="btn btn-secondary photo-card__action"
                  onClick={() => openUploadPicker(photo.id)}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="btn btn-secondary photo-card__action photo-card__action--danger"
                  onClick={() => removePhoto(photo.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="photo-field__choices">
          <button type="button" className="btn btn-secondary" onClick={() => openCamera(null)}>
            {photos.length > 0 && multiple ? "Add photo" : "Use camera"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => openUploadPicker(null)}>
            {photos.length > 0 && multiple ? "Upload another" : "Upload photo"}
          </button>
        </div>
      )}

      {cameraOpen && (
        <div className="photo-modal" role="dialog" aria-modal="true">
          <div className="photo-modal__content photo-modal__content--camera">
            <h3 className="photo-camera__title">Live camera</h3>
            <p className="photo-camera__mode muted">
              {facingMode === "environment" ? "Back camera" : "Front camera"}
            </p>
            {cameraError ? (
              <p className="error">{cameraError}</p>
            ) : (
              <video ref={videoRef} className="photo-camera__video" playsInline muted />
            )}
            <div className="photo-camera__actions">
              <button type="button" className="btn btn-secondary" onClick={closeCamera}>
                Cancel
              </button>
              {!cameraError && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={switchCamera}>
                    Switch camera
                  </button>
                  <button type="button" className="btn btn-primary" onClick={capturePhoto}>
                    Capture
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="photo-modal" role="dialog" aria-modal="true" onClick={() => setViewingPhoto(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            <img src={viewingPhoto.previewUrl} alt="" className="photo-modal__image" />
            <button type="button" className="btn btn-secondary" onClick={() => setViewingPhoto(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
