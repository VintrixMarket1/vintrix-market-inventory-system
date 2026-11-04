// Shared listing-description format used everywhere (add product, convert unknown, listings)
export function descriptionRules(langName, internalCode) {
  return `=== LISTING DESCRIPTION FORMAT (follow this example EXACTLY, including all blank lines between sections) ===
Please check measurements before purchasing!
Premium Addonee cable knit sweater in a stylish olive green colour. Made from 100% merino wool, this classic jumper features a timeless textured cable knit design, making it perfect for autumn, winter, smart casual outfits, office wear, or everyday comfort.

Condition: Brand new with tags

Size on label: M
Actual fit: Approx. Men's M

Measurements:
Chest: 50 cm
Length: 57 cm
Sleeve: 58 cm

Material:
100% Merino Wool

Features:
Premium cable knit pattern
Soft and breathable merino wool
Ribbed mock neck, cuffs and hem
Warm yet lightweight
Classic regular fit
Ideal for casual, business casual and winter layering

Fast shipping
${internalCode ? `\n${internalCode}\n` : ""}
=== DESCRIPTION RULES ===
- Plain text only, NO HTML, NO markdown, NO emojis
- ALWAYS keep blank lines between every section as shown in the example
- Line 1 is ALWAYS: "Please check measurements before purchasing!"
- Then one descriptive paragraph (2-4 sentences: brand, type, colour, material, style, use cases)
- Then "Condition: [value]"
- Then "Size on label: [value]" and "Actual fit: [value]" (for non-clothing products use model/variant and compatibility instead)
- Then "Measurements:" with relevant lines (clothing: Chest/Length/Sleeve; shoes: Insole length; other products: Width/Height/Depth/Weight)
- Then "Material:" with material composition
- Then "Features:" with 5-6 points, one per line, no bullet characters
- Then "Fast shipping"
${internalCode ? "- Then the product internal code (SKU) as the last line" : "- \"Fast shipping\" is the last line (the SKU is appended automatically)"}
- If a value is unknown, write "Not provided" but KEEP the line so the structure stays intact
- Write naturally and persuasively, like a real seller
- LANGUAGE: Write the ENTIRE description in ${langName}. Translate every fixed line and header from the example (e.g. "Please check measurements before purchasing!", "Condition:", "Size on label:", "Actual fit:", "Measurements:", "Material:", "Features:", "Fast shipping", "Not provided") into ${langName}, keeping the same structure.`;
}