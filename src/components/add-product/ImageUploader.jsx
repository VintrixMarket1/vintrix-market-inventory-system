import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, Sparkles, ImagePlus } from "lucide-react";

export default function ImageUploader({ uploadedImages, onImagesReady, onAnalyze }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    setUploading(true);
    const newUrls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
    }
    onImagesReady([...uploadedImages, ...newUrls]);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) handleFiles(files);
  };

  const removeImage = (idx) => {
    const updated = uploadedImages.filter((_, i) => i !== idx);
    onImagesReady(updated);
  };

  return (
    <div className="space-y-5">
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <p>Przesyłam zdjęcia...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <ImagePlus className="w-10 h-10 text-slate-300" />
            <p className="font-medium">Kliknij lub przeciągnij zdjęcia tutaj</p>
            <p className="text-sm">Wgraj co najmniej 1 zdjęcie, aby AI mogło przeanalizować produkt</p>
          </div>
        )}
      </div>

      {uploadedImages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Wgrane zdjęcia ({uploadedImages.length})
          </p>
          <div className="grid grid-cols-4 gap-3">
            {uploadedImages.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} className="w-full h-full object-cover rounded-lg border" alt="" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    Główne
                  </span>
                )}
              </div>
            ))}
            <div
              className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400 transition"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      <Button
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={uploadedImages.length === 0 || uploading}
        onClick={onAnalyze}
        size="lg"
      >
        <Sparkles className="w-4 h-4" />
        Analizuj z AI
      </Button>
    </div>
  );
}