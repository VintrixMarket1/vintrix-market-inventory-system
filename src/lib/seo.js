// Ustawia tytuł strony i meta tagi SEO (description, Open Graph) — dla katalogu i kolekcji
export function setSeoMeta({ title, description }) {
  if (title) {
    document.title = title;
    const setMeta = (attr, key, content) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("property", "og:title", title);
    if (description) setMeta("property", "og:description", description);
  }
  if (description) {
    let el = document.head.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", description);
  }
}