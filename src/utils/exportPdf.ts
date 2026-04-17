import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export const exportFlowToPDF = async (
  elementId: string,
  filename: string = 'puzzle-flow.pdf'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const controls = element.querySelector('.react-flow__controls') as HTMLElement | null;
  const minimap = element.querySelector('.react-flow__minimap') as HTMLElement | null;

  if (controls) controls.style.visibility = 'hidden';
  if (minimap) minimap.style.visibility = 'hidden';

  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      backgroundColor: '#0f172a',
      pixelRatio: 2,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [element.offsetWidth, element.offsetHeight],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
    pdf.save(filename);
  } catch (err) {
    console.error('Failed to export PDF', err);
    alert('Failed to export PDF. Please try again.');
  } finally {
    if (controls) controls.style.visibility = 'visible';
    if (minimap) minimap.style.visibility = 'visible';
  }
};
