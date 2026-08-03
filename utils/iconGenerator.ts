

export const generateIcon = async ( // Marked as async
  label: string,
  bgColor: string,
  textColor: string = '#FFFFFF',
  size: number = 432,
  isRound: boolean = false,
  imageData?: string // NEW: Optional base64 image data
): Promise<string> => { // Returns a Promise<string>
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("Could not get 2D context for canvas.");
    return '';
  }

  ctx.clearRect(0, 0, size, size); // Clear canvas before drawing

  if (imageData) {
    const img = new Image();
    img.src = `data:image/png;base64,${imageData}`; // Assume PNG for now, or pass mimeType
    await new Promise(resolve => img.onload = resolve); // Wait for image to load

    // If it's a round icon, first draw a solid background of the specified color
    if (isRound) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, false);
      ctx.fillStyle = bgColor; // Use bgColor for the round background
      ctx.fill();
      ctx.closePath();
    } else {
      // For square, fill the whole background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }
    
    // Draw the image, centered and scaled to fit the square area
    const imgAspectRatio = img.width / img.height;
    const canvasAspectRatio = size / size; // Always 1 for square canvas

    let drawWidth = size;
    let drawHeight = size;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspectRatio > canvasAspectRatio) { // Image is wider than canvas
        drawHeight = size;
        drawWidth = img.width * (size / img.height);
        offsetX = (size - drawWidth) / 2;
    } else { // Image is taller than canvas
        drawWidth = size;
        drawHeight = img.height * (size / img.width);
        offsetY = (size - drawHeight) / 2;
    }

    // Draw the image onto the canvas
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // If isRound, apply a circular mask to the drawn image
    if (isRound) {
      ctx.globalCompositeOperation = 'destination-in'; // Only keep pixels inside the new shape
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; // Reset to default
    }

  } else {
    // Existing text icon generation logic
    if (isRound) {
      // Draw a circular background
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, false);
      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.closePath();
    } else {
      // Draw a square background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    // Draw text
    ctx.fillStyle = textColor; // Use the dynamic textColor here
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let fontSize = size * 0.5;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`; 

    if (label.length > 2) {
      fontSize = size * 0.35; // Smaller for longer labels
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    }
    
    // Limit label to first two characters for better icon readability
    ctx.fillText(label.substring(0, 2), size / 2, size / 2);
  }

  return canvas.toDataURL('image/png').split(',')[1]; // Return base64 data only
};