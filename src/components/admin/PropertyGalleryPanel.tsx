"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/react";
import { adminApi, type PropertyPicture } from "@/lib/admin-api";

interface Props {
  propertyId: number;
  pictures: PropertyPicture[];
  readOnly?: boolean;
  onPicturesChange?: (pics: PropertyPicture[]) => void;
}

export function PropertyGalleryPanel({ propertyId, pictures, readOnly = false, onPicturesChange }: Props) {
  const [pics, setPics] = useState<PropertyPicture[]>(pictures);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (pics: PropertyPicture[]) => {
    setPics(pics);
    onPicturesChange?.(pics);
  };

  const refreshPics = useCallback(async () => {
    const updated = await adminApi.getPropertyPictures(propertyId);
    notify(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        await adminApi.uploadPropertyPicture(propertyId, file, pics.length === 0);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error al subir imagen";
        errors.push(`${file.name}: ${msg}`);
      }
    }
    await refreshPics();
    setUploading(false);
    if (errors.length > 0) {
      addToast({ title: "Algunas imágenes no se subieron", description: errors.join(" | "), color: "warning" });
    } else {
      addToast({ title: `${files.length} imagen${files.length > 1 ? "es" : ""} subida${files.length > 1 ? "s" : ""}`, color: "success" });
    }
  };

  const handleSetPrimary = async (pic: PropertyPicture) => {
    if (pic.is_primary || readOnly) return;
    setPrimaryId(pic.id);
    try {
      await adminApi.setPropertyPicturePrimary(propertyId, pic.id);
      await refreshPics();
      addToast({ title: "Portada actualizada", color: "success" });
    } catch {
      addToast({ title: "No se pudo actualizar la portada", color: "danger" });
    } finally {
      setPrimaryId(null);
    }
  };

  const handleDelete = async (pic: PropertyPicture) => {
    if (readOnly) return;
    setDeletingId(pic.id);
    try {
      await adminApi.deletePropertyPicture(propertyId, pic.id);
      await refreshPics();
      addToast({ title: "Imagen eliminada", color: "success" });
    } catch {
      addToast({ title: "No se pudo eliminar la imagen", color: "danger" });
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!readOnly) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Zona de carga */}
      {!readOnly && (
        <div
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors duration-200 p-8 cursor-pointer
            ${dragOver ? "border-[#9b74ff] bg-[#9b74ff]/10" : "border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.06]"}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" color="secondary" />
              <span className="text-sm text-white/60">Subiendo imágenes…</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-[#9b74ff]/10 border border-[#9b74ff]/20 flex items-center justify-center">
                <Icon icon="solar:upload-bold-duotone" className="text-[#9b74ff] text-2xl" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/80">
                  Arrastra imágenes aquí o <span className="text-[#9b74ff]">haz clic para seleccionar</span>
                </p>
                <p className="text-xs text-white/40 mt-1">JPG, PNG, WebP · Máx. 15 MB por imagen</p>
              </div>
              <Button
                size="sm"
                variant="flat"
                className="rounded-xl bg-white/10 text-white/80 border border-white/10"
                onPress={() => fileRef.current?.click()}
                startContent={<Icon icon="solar:gallery-add-bold" width={15} />}
              >
                Seleccionar archivos
              </Button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Cuadrícula de imágenes */}
      {pics.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-white/30">
          <Icon icon="solar:gallery-bold-duotone" className="text-5xl opacity-30" />
          <p className="text-sm">{readOnly ? "Este alojamiento no tiene imágenes cargadas." : "Aún no hay imágenes. Sube la primera."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {pics.map((pic) => (
            <div
              key={pic.id}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] aspect-video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pic.url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Overlay de acciones */}
              {!readOnly && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2 gap-1.5">
                  {!pic.is_primary && (
                    <button
                      className="flex-1 flex items-center justify-center gap-1 text-xs rounded-xl bg-[#9b74ff]/80 hover:bg-[#9b74ff] text-white px-2 py-1.5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleSetPrimary(pic); }}
                      disabled={primaryId === pic.id}
                      title="Establecer como portada"
                    >
                      {primaryId === pic.id
                        ? <Spinner size="sm" color="white" />
                        : <><Icon icon="solar:star-bold" width={13} /> Portada</>
                      }
                    </button>
                  )}
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(pic); }}
                    disabled={deletingId === pic.id}
                    title="Eliminar imagen"
                  >
                    {deletingId === pic.id
                      ? <Spinner size="sm" color="white" />
                      : <Icon icon="solar:trash-bin-trash-bold" width={15} />
                    }
                  </button>
                </div>
              )}

              {/* Badge portada */}
              {pic.is_primary && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-[#9b74ff] px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                  <Icon icon="solar:star-bold" width={10} />
                  Portada
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && pics.length > 0 && (
        <p className="text-xs text-white/35 text-center">
          {pics.length} imagen{pics.length !== 1 ? "es" : ""}
          {" · "}Pasa el cursor sobre una imagen para administrarla
        </p>
      )}
    </div>
  );
}
