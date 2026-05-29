import { toPng } from 'html-to-image';

function hideExportUi(element: Element): HTMLElement[] {
  const selectors = ['.react-flow__controls', '.react-flow__minimap', '.react-flow__panel'];
  const hidden: HTMLElement[] = [];
  selectors.forEach((sel) => {
    const el = element.querySelector(sel) as HTMLElement | null;
    if (el) {
      el.style.visibility = 'hidden';
      hidden.push(el);
    }
  });
  return hidden;
}

function restoreExportUi(els: HTMLElement[]): void {
  els.forEach((el) => { el.style.visibility = 'visible'; });
}

export async function exportFlowToPNG(
  elementId: string,
  filename = 'puzzle-flow.png',
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const hidden = hideExportUi(element);
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      backgroundColor: '#0f172a',
      pixelRatio: 2,
    });
    const a = document.createElement('a');
    a.download = filename;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error('Failed to export PNG', err);
    alert('Failed to export PNG. Please try again.');
  } finally {
    restoreExportUi(hidden);
  }
}
