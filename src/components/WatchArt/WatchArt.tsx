import { hueFromSku, initialsFromName } from './watchArtLogic';
import './WatchArt.css';

interface WatchArtProps {
  sku: string;
  name: string;
  size?: number;
}

export default function WatchArt({ sku, name, size = 72 }: WatchArtProps) {
  const hue = hueFromSku(sku);
  const initials = initialsFromName(name);

  return (
    <div
      className="watch-art"
      style={
        // Type assertion justified: React's CSSProperties type has no index
        // signature for custom properties (CSS variables), so TS can't infer
        // this object shape on its own.
        {
          '--watch-hue': String(hue),
          width: size,
          height: size,
        } as React.CSSProperties
      }
    >
      <span className="watch-art__initials">{initials}</span>
    </div>
  );
}
