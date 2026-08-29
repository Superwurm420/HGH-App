import { ImageGallery } from '@/components/ui/ImageGallery';
import { mediaUrl } from '@/lib/api/client';
import { loadTvImages } from '@/server/page-data';

export const dynamic = 'force-dynamic';

export default async function GaleriePage() {
  const images = await loadTvImages();

  const items = images.map((image) => ({
    id: image.id,
    filename: image.filename,
    url: mediaUrl(image.id),
  }));

  return (
    <>
      <h1 className="sr-only">Bildergalerie</h1>

      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Bildergalerie</h2>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted">Aktuell sind keine Bilder hinterlegt.</p>
        ) : (
          <>
            <ImageGallery images={items} />
            <p className="meta-note">
              Dieselben Bilder laufen auf dem Bildschirm im Eingangsbereich.
            </p>
          </>
        )}
      </div>
    </>
  );
}
