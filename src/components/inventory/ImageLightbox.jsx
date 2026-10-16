import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ImageLightbox({ url, onClose }) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-2">
        {url && (
          <img
            src={url}
            alt="Powiększone zdjęcie produktu"
            className="w-full max-h-[80vh] object-contain rounded-lg"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}