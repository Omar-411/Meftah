"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MAX_PHOTOS, type ListingPhoto } from "@/domain/listing/listing";
import { newId } from "@/domain/shared/id";
import { fileToDataUrl } from "@/lib/image";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

interface PhotoManagerProps {
  photos: readonly ListingPhoto[];
  title: string;
  error?: string;
  onChange: (photos: readonly ListingPhoto[]) => void;
}

export function PhotoManager({ photos, title, error, onChange }: PhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setUploadError(null);
    try {
      const room = MAX_PHOTOS - photos.length;
      const added = await Promise.all(
        Array.from(files)
          .slice(0, room)
          .map(async (file): Promise<ListingPhoto> => ({ id: newId("ph"), fileName: file.name, url: await fileToDataUrl(file), alt: title || file.name })),
      );
      onChange([...photos, ...added]);
    } catch {
      setUploadError("Une photo n'a pas pu être lue. Utilisez un fichier JPG ou PNG.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const makeCover = (id: string) => {
    const picked = photos.find((photo) => photo.id === id);
    if (picked) onChange([picked, ...photos.filter((photo) => photo.id !== id)]);
  };

  return (
    <div>
      <ul className="grid grid-cols-2 gap-space-sm sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-container-high">
            <Image src={photo.url} alt={photo.alt} fill sizes="200px" className="object-cover" />
            {index === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 font-label-sm text-label-sm text-on-primary">Couverture</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-on-surface/60 to-transparent p-1.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {index !== 0 && (
                <button type="button" onClick={() => makeCover(photo.id)} aria-label="Définir comme couverture" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface">
                  <Icon name="star" className="text-[16px]" />
                </button>
              )}
              <button type="button" onClick={() => onChange(photos.filter((candidate) => candidate.id !== photo.id))} aria-label="Supprimer la photo" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest text-error">
                <Icon name="delete" className="text-[16px]" />
              </button>
            </div>
          </li>
        ))}

        {photos.length < MAX_PHOTOS && (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary",
                busy && "opacity-60",
              )}
            >
              <Icon name={busy ? "progress_activity" : "add_photo_alternate"} className={cn("text-[28px]", busy && "animate-spin")} />
              <span className="font-label-md text-label-md">{busy ? "Traitement…" : "Ajouter des photos"}</span>
            </button>
          </li>
        )}
      </ul>

      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void addFiles(event.target.files)} />
      <p className="mt-space-sm font-label-sm text-label-sm text-on-surface-variant">
        {photos.length} / {MAX_PHOTOS} photos · la première est la couverture sur le site.
      </p>
      {(error || uploadError) && (
        <p role="alert" className="mt-1 font-label-sm text-label-sm text-error">
          {error ?? uploadError}
        </p>
      )}
    </div>
  );
}
