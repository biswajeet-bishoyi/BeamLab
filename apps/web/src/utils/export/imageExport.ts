import { downloadFile } from './downloadFile';

export async function exportCanvasImage(format: 'png' | 'svg') {
  // Find the primary BeamCanvas SVG element
  const canvasElement = document.querySelector('.beam-canvas-svg') as SVGSVGElement | null;
  if (!canvasElement) {
    throw new Error('Canvas SVG not found on screen');
  }

  // Clone it to modify safely
  const clone = canvasElement.cloneNode(true) as SVGSVGElement;
  
  // Serialize the SVG string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  
  // Add XML namespace if missing
  if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (format === 'svg') {
    downloadFile(svgString, 'beam_canvas.svg', 'image/svg+xml');
    return;
  }

  // PNG Rasterization
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use high res for export
      canvas.width = canvasElement.clientWidth * 2;
      canvas.height = canvasElement.clientHeight * 2;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get 2d context'));
      
      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw SVG scaled up 2x
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, canvasElement.clientWidth, canvasElement.clientHeight);
      
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, 'beam_canvas.png', 'image/png');
          resolve();
        } else {
          reject(new Error('Failed to generate PNG blob'));
        }
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG for rasterization'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
}
