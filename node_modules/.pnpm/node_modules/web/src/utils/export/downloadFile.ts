/**
 * Helper utility to trigger a browser download for a Blob or text content.
 */
export function downloadFile(content: Blob | string, filename: string, mimeType: string) {
  let url: string;
  
  if (typeof content === 'string') {
    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);
  } else {
    url = URL.createObjectURL(content);
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
