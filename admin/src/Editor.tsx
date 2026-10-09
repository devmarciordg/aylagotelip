import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { api } from './api';

const Delta = Quill.import('delta') as typeof import('quill/core').Delta;

/** Escolhe um arquivo, sobe para a API (que devolve WebP) e insere com width/height — nunca Base64. */
async function uploadImage(quill: Quill) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('file', file);

    try {
      const { url, width, height } = await api<{ url: string; width: number; height: number }>(
        '/api/admin/uploads',
        { method: 'POST', body },
      );
      // Caminho relativo, nunca `API_BASE + url`: o HTML do corpo e gravado no
      // banco e republicado como esta. Um `http://localhost:8080/uploads/...`
      // escrito de uma maquina de desenvolvimento sobrevive ate o site no ar --
      // e `imgSize` (site/build/imgsize.js) so casa com `/uploads/`, entao a
      // imagem ainda sairia sem width/height. O proxy do vite serve a previa.
      const src = url;
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'image', src, 'user');
      quill.setSelection(range.index + 1, 0);

      // width/height explicitos no HTML: e o que mata o CLS no site publico
      const img = quill.root.querySelector<HTMLImageElement>(`img[src="${src}"]`);
      img?.setAttribute('width', String(width));
      img?.setAttribute('height', String(height));
    } catch (e) {
      // alert() trava a aba e apaga o contexto do cursor; o aviso vai para a
      // barra do editor, onde o upload foi pedido.
      const bar = quill.container.previousElementSibling;
      const aviso = document.createElement('p');
      aviso.className = 'editor__erro';
      aviso.setAttribute('role', 'alert');
      aviso.textContent =
        (e as Error).message === 'arquivo_muito_grande'
          ? 'Imagem acima de 8 MB. Reduza o arquivo e envie de novo.'
          : 'Não foi possível enviar a imagem. Tente de novo.';
      bar?.parentElement?.querySelector('.editor__erro')?.remove();
      bar?.after(aviso);
      setTimeout(() => aviso.remove(), 8000);
    }
  };

  input.click();
}

export function Editor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const quill = useRef<Quill | null>(null);
  const emit = useRef(onChange);
  emit.current = onChange;

  useEffect(() => {
    if (!host.current || quill.current) return;

    const q = new Quill(host.current, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            [{ header: [2, 3, false] }],
            ['bold', 'italic', 'link'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'image'],
            ['clean'],
          ],
          handlers: { image: () => uploadImage(q) },
        },
      },
    });

    // Bloqueio severo de Base64: imagem colada como data: URI e descartada.
    q.clipboard.addMatcher('IMG', (node, delta) => {
      const src = (node as HTMLImageElement).getAttribute('src') ?? '';
      return src.startsWith('data:') ? new Delta() : delta;
    });

    q.on('text-change', () => emit.current(q.root.innerHTML));
    quill.current = q;
  }, []);

  // Sincroniza valor vindo de fora sem destruir a posicao do cursor durante a digitacao.
  useEffect(() => {
    const q = quill.current;
    if (q && value !== q.root.innerHTML) q.root.innerHTML = value;
  }, [value]);

  return <div className="editor" ref={host} />;
}
