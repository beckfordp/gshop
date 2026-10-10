import { imageForSku } from '../../data/watchImages';
import './WatchArt.css';

interface WatchArtProps {
  sku: string;
  name: string;
  size?: number;
}

export default function WatchArt({ sku, name, size = 72 }: WatchArtProps) {
  return (
    <div className="watch-art" style={{ width: size, height: size }}>
      <img className="watch-art__photo" src={imageForSku(sku)} alt={name} />
    </div>
  );
}
