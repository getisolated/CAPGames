"use client";

import { useState, useTransition } from "react";
import { Check, FolderPlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Photo, PhotoAlbum } from "@/lib/supabase/types";
import {
  approvePhoto,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  moveToAlbum,
  rejectPhoto,
} from "./actions";

type PhotoWithUrl = Photo & { url: string | null };

export function PhotosAdmin({
  albums,
  photos,
}: {
  albums: PhotoAlbum[];
  photos: PhotoWithUrl[];
}) {
  const [isPending, startTransition] = useTransition();
  const [albumChoice, setAlbumChoice] = useState<Record<string, string>>({});

  const pending = photos.filter((p) => p.status === "pending");
  const approved = photos.filter((p) => p.status === "approved");
  const rejected = photos.filter((p) => p.status === "rejected");

  function call(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>,
    fd: FormData
  ) {
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Fait.");
    });
  }

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pending">À valider ({pending.length})</TabsTrigger>
        <TabsTrigger value="approved">Validées ({approved.length})</TabsTrigger>
        <TabsTrigger value="rejected">Refusées ({rejected.length})</TabsTrigger>
        <TabsTrigger value="albums">Albums</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <PhotoGrid
          photos={pending}
          renderActions={(photo) => (
            <>
              <Select
                value={albumChoice[photo.id] ?? ""}
                onValueChange={(v) =>
                  setAlbumChoice((s) => ({ ...s, [photo.id]: v }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir un album…" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", photo.id);
                    fd.set("album_id", albumChoice[photo.id] ?? "");
                    call(approvePhoto, fd);
                  }}
                  disabled={isPending}
                >
                  <Check className="size-4" /> Valider
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", photo.id);
                    call(rejectPhoto, fd);
                  }}
                  disabled={isPending}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="approved">
        <PhotoGrid
          photos={approved}
          renderActions={(photo) => (
            <div className="flex flex-col gap-1">
              <Select
                value={photo.album_id ?? ""}
                onValueChange={(v) => {
                  const fd = new FormData();
                  fd.set("id", photo.id);
                  fd.set("album_id", v);
                  call(moveToAlbum, fd);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Album" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("id", photo.id);
                  call(deletePhoto, fd);
                }}
                disabled={isPending}
              >
                <Trash2 className="size-4" /> Supprimer
              </Button>
            </div>
          )}
        />
      </TabsContent>

      <TabsContent value="rejected">
        <PhotoGrid
          photos={rejected}
          renderActions={(photo) => (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const fd = new FormData();
                fd.set("id", photo.id);
                call(deletePhoto, fd);
              }}
              disabled={isPending}
            >
              <Trash2 className="size-4" /> Supprimer
            </Button>
          )}
        />
      </TabsContent>

      <TabsContent value="albums" className="space-y-4">
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await createAlbum(fd);
              if (!res.ok) toast.error(res.error ?? "Erreur");
            });
          }}
          className="flex gap-2"
        >
          <Input name="name" placeholder="Nom de l'album" required />
          <Button type="submit" disabled={isPending}>
            <FolderPlus className="size-4" /> Créer
          </Button>
        </form>
        <ul className="space-y-2">
          {albums.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <span>{a.name}</span>
              <form
                action={async (fd) => {
                  startTransition(async () => {
                    const res = await deleteAlbum(fd);
                    if (!res.ok) toast.error(res.error ?? "Erreur");
                  });
                }}
              >
                <input type="hidden" name="id" value={a.id} />
                <Button size="sm" variant="ghost" disabled={isPending}>
                  <Trash2 className="size-4" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}

function PhotoGrid({
  photos,
  renderActions,
}: {
  photos: PhotoWithUrl[];
  renderActions: (photo: PhotoWithUrl) => React.ReactNode;
}) {
  if (photos.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucune photo dans cette catégorie.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <Card key={photo.id} className="overflow-hidden p-0">
          <div className="relative aspect-square bg-muted">
            {photo.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo.url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : null}
            <Badge className="absolute left-2 top-2">{photo.status}</Badge>
          </div>
          <div className="space-y-2 p-3">
            <p className="truncate text-xs text-muted-foreground">
              {photo.original_filename}
            </p>
            {renderActions(photo)}
          </div>
        </Card>
      ))}
    </div>
  );
}
