import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Code2 } from "lucide-react";

// Sanitize to only Allegro-allowed tags
function sanitizeAllegroHtml(html) {
  // Keep only: h1, h2, p, ul, ol, li, b
  const allowed = /<\/?(h1|h2|p|ul|ol|li|b)(\s[^>]*)?>|<br\s*\/?>/gi;
  const result = html.replace(/<[^>]+>/g, (tag) => {
    if (allowed.test(tag)) return tag;
    return "";
  });
  // reset regex
  allowed.lastIndex = 0;
  return result;
}

export default function AllegroDescriptionEditor({ value, onChange }) {
  const [tab, setTab] = useState("edit");

  return (
    <div className="space-y-1.5">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Opis Allegro (HTML)</span>
          <TabsList className="h-7 text-xs">
            <TabsTrigger value="edit" className="h-6 px-2 text-xs gap-1">
              <Code2 className="w-3 h-3" /> Edytuj HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs gap-1">
              <Eye className="w-3 h-3" /> Podgląd
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="mt-1">
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder="<h2>Opis produktu</h2>&#10;<p>Treść...</p>&#10;<ul>&#10;  <li>Cecha 1</li>&#10;</ul>"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dozwolone tagi: <code className="bg-slate-100 px-1 rounded">h1 h2 p ul ol li b</code>
          </p>
        </TabsContent>

        <TabsContent value="preview" className="mt-1">
          <div
            className="border rounded-md p-4 min-h-[200px] bg-white text-sm prose prose-sm max-w-none allegro-preview"
            dangerouslySetInnerHTML={{ __html: sanitizeAllegroHtml(value || "") }}
          />
          <style>{`
            .allegro-preview h1 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
            .allegro-preview h2 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; color: #1a1a1a; }
            .allegro-preview p { margin: 0.4rem 0; line-height: 1.6; }
            .allegro-preview ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
            .allegro-preview ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
            .allegro-preview li { margin: 0.2rem 0; }
            .allegro-preview b { font-weight: 600; }
          `}</style>
        </TabsContent>
      </Tabs>
    </div>
  );
}