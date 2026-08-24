import { useEffect, useRef, useState } from "react";

const RATIOS = [
  { id: "1:1", w: 600, h: 600 },
  { id: "4:3", w: 800, h: 600 },
  { id: "16:9", w: 1067, h: 600 },
  { id: "21:9", w: 1400, h: 600 },
];

const SHADOW_TARGETS = [
  { id: "all", title: "全部", path: "m12 16l7.36-5.73L21 9l-9-7l-9 7l1.63 1.27M12 18.54l-7.38-5.73L3 14.07l9 7l9-7l-1.63-1.27z" },
  { id: "text", title: "文字", path: "m18.5 4l1.16 4.35l-.96.26c-.45-.87-.91-1.74-1.44-2.18C16.73 6 16.11 6 15.5 6H13v10.5c0 .5 0 1 .33 1.25c.34.25 1 .25 1.67.25v1H9v-1c.67 0 1.33 0 1.67-.25c.33-.25.33-.75.33-1.25V6H8.5c-.61 0-1.23 0-1.76.43c-.53.44-.99 1.31-1.44 2.18l-.96-.26L5.5 4z" },
  { id: "icon", title: "图标", path: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z" },
];

const ICONIFY_BASE = "https://api.iconify.design";

async function fetchIconifyIcon(name: string): Promise<string> {
  const res = await fetch(`${ICONIFY_BASE}/${name}.svg`);
  if (!res.ok) throw new Error("图标获取失败");
  return res.text();
}

function tintSvg(svg: string, color: string): string {
  if (color === "auto") return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const tinted = svg.replace(/currentColor/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinted)}`;
}

async function searchIconify(query: string): Promise<string[]> {
  const res = await fetch(`${ICONIFY_BASE}/search?query=${encodeURIComponent(query)}&limit=20`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.icons) ? data.icons : [];
}

function Card({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="border border-border bg-card py-4 text-sm text-card-foreground">
      <div className="px-4 flex items-center justify-between">
        <div className="font-mono text-base font-medium tracking-tight">{title}</div>
        {extra}
      </div>
      <div className="px-4 space-y-4 mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`peer relative flex size-4 shrink-0 items-center justify-center border transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-ring ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
        }`}
      >
        {checked && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3.5 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
        )}
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function ToggleRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between p-2 border border-border cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`peer relative flex size-4 shrink-0 items-center justify-center border transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-ring ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
        }`}
      >
        {checked && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
        )}
      </button>
    </label>
  );
}

function Slider({ value, min, max, step = 1, onChange, format, name, minLabel, maxLabel }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  name?: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  const show = format ? format(value) : String(value);
  const sliderRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;
  const stepRef = useRef(step);
  stepRef.current = step;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const rafRef = useRef<number | null>(null);
  const dragRef = useRef(false);
  const latestRef = useRef(value);

  useEffect(() => {
    if (dragRef.current) return;
    latestRef.current = value;
    if (sliderRef.current) sliderRef.current.value = String(value);
  }, [value]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stepRef.current * (e.shiftKey ? 5 : 1);
      const delta = e.deltaY < 0 ? s : -s;
      onChangeRef.current(Math.max(minRef.current, Math.min(maxRef.current, valueRef.current + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startDrag = (e: React.PointerEvent<HTMLInputElement>) => {
    dragRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const endDrag = () => {
    dragRef.current = false;
    latestRef.current = Number(sliderRef.current?.value ?? valueRef.current);
    onChangeRef.current(latestRef.current);
  };

  const onDrag = () => {
    if (!dragRef.current) return;
    const v = Number(sliderRef.current?.value ?? valueRef.current);
    latestRef.current = v;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (dragRef.current) onChangeRef.current(latestRef.current);
    });
  };

  return (
    <Field label={name ? `${name}: ${show}` : show}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-8">{minLabel ?? min}</span>
        <input
          ref={sliderRef}
          type="range"
          min={min}
          max={max}
          step={step}
          defaultValue={value}
          onPointerDown={startDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onChange={(e) => {
            if (dragRef.current) {
              onDrag();
            } else {
              onChangeRef.current(Number(e.target.value));
            }
          }}
          onKeyDown={(e) => {
            const s = step * (e.shiftKey ? 5 : 1);
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
              e.preventDefault();
              onChange(Math.min(max, value + s));
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
              e.preventDefault();
              onChange(Math.max(min, value - s));
            }
          }}
          className="flex-1 h-1 appearance-none bg-[#4d4e4f] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-none [&::-moz-range-track]:bg-[#4d4e4f] [&::-moz-range-progress]:bg-[#4d4e4f] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-none"
        />
        <span className="text-xs text-muted-foreground w-8 text-right">{maxLabel ?? max}</span>
      </div>
    </Field>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex h-8 w-full border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(v);
}

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const textRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);
  const pendingRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (textRef.current) textRef.current.value = value;
    if (colorRef.current) colorRef.current.value = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flush = () => {
    if (pendingRef.current !== null) {
      onChangeRef.current(pendingRef.current);
      pendingRef.current = null;
    }
  };

  const commit = (v: string) => {
    pendingRef.current = v;
    const now = Date.now();
    const elapsed = now - lastRunRef.current;
    if (elapsed >= 40) {
      lastRunRef.current = now;
      flush();
      return;
    }
    if (timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => {
      lastRunRef.current = Date.now();
      flush();
      timerRef.current = null;
    }, 40 - elapsed);
  };

  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">{label}</label>
      <div className="flex items-center gap-2">
        <input
          ref={textRef}
          type="text"
          disabled={disabled}
          defaultValue={value}
          onBlur={() => {
            const v = (textRef.current?.value ?? "").trim();
            if (isValidHex(v)) onChange(v);
            else if (textRef.current) textRef.current.value = valueRef.current;
          }}
          className="w-24 h-8 text-xs border border-input bg-transparent px-2 disabled:opacity-50"
        />
        <input
          ref={colorRef}
          type="color"
          disabled={disabled}
          defaultValue={value}
          onInput={(e) => {
            commit(e.currentTarget.value);
          }}
          className="w-8 h-8 cursor-pointer border-0 p-0 bg-transparent disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function SegButton({ active, title, path, onClick }: { active: boolean; title: string; path: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap border font-mono font-medium tracking-tight transition-colors duration-75 h-7 gap-1 px-2.5 text-xs ${
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-foreground"
          : "border-transparent text-muted-foreground hover:bg-foreground hover:text-background"
      }`}
    >
      <span className="inline-flex items-center justify-center shrink-0 leading-none h-4 w-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 block" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
      </span>
    </button>
  );
}

export function Cover() {
  const [tab, setTab] = useState<"content" | "style" | "export">("content");
  const [leftText, setLeftText] = useState("示例");
  const [rightText, setRightText] = useState("文本");
  const [fontWeight, setFontWeight] = useState(400);
  const [fontSize, setFontSize] = useState(64);
  const [iconSize, setIconSize] = useState(64);
  const [iconRound, setIconRound] = useState(0);
  const [gap, setGap] = useState(20);
  const [showIcon, setShowIcon] = useState(true);
  const [iconDataUri, setIconDataUri] = useState<string>("");
  const [iconifyRawSvg, setIconifyRawSvg] = useState<string>("");
  const [iconName, setIconName] = useState("simple-icons:cloudflare");
  const [iconSource, setIconSource] = useState<"iconify" | "upload">("iconify");
  const [iconSearch, setIconSearch] = useState("");
  const [iconResults, setIconResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [textColor, setTextColor] = useState("#000000");
  const [iconColor, setIconColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgOpacity, setBgOpacity] = useState(1);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [ratio, setRatio] = useState("16:9");
  const [scale, setScale] = useState(1);
  const [proportional, setProportional] = useState(true);
  const [fileName, setFileName] = useState("cover");
  const [format, setFormat] = useState<"PNG" | "SVG">("PNG");
  const [transparent, setTransparent] = useState(false);
  const [iconBg, setIconBg] = useState(false);
  const [iconColorSync, setIconColorSync] = useState(true);
  const [iconOriginalColor, setIconOriginalColor] = useState(false);
  const [shadowTarget, setShadowTarget] = useState<"all" | "text" | "icon">("all");
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(0);
  const [shadowOpacity, setShadowOpacity] = useState(0);
  const [customFont, setCustomFont] = useState<string>("");
  const [fontSupported, setFontSupported] = useState<boolean>(() => "FontFace" in window);
  const [fontError, setFontError] = useState(false);

  const ratioMeta = RATIOS.find((r) => r.id === ratio)!;
  const baseW = ratioMeta.w;
  const baseH = ratioMeta.h;
  const W = baseW * scale;
  const H = baseH * scale;
  const effTextColor = textColor;
  const effIconColor = iconOriginalColor ? "auto" : iconColorSync ? textColor : iconColor;
  const effSize = Math.round((proportional ? iconSize * scale : iconSize));
  const effFontSize = Math.round(proportional ? fontSize * scale : fontSize);
  const effGap = proportional ? gap * scale : gap;

  const lastFontSizeRef = useRef(fontSize);
  const lastIconSizeRef = useRef(iconSize);

  const handleFontSizeChange = (v: number) => {
    if (proportional) {
      const r = v / lastFontSizeRef.current;
      setIconSize((prev) => {
        const next = Math.max(20, Math.min(700, Math.round(prev * r)));
        lastIconSizeRef.current = next;
        return next;
      });
    }
    setFontSize(v);
    lastFontSizeRef.current = v;
  };

  const handleIconSizeChange = (v: number) => {
    if (proportional) {
      const r = v / lastIconSizeRef.current;
      setFontSize((prev) => {
        const next = Math.max(20, Math.min(700, Math.round(prev * r)));
        lastFontSizeRef.current = next;
        return next;
      });
    }
    setIconSize(v);
    lastIconSizeRef.current = v;
  };

  useEffect(() => {
    if (iconSource !== "iconify") return;
    const u = iconName.replace(":", "/");
    const timer = setTimeout(() => {
      fetchIconifyIcon(u)
        .then(setIconifyRawSvg)
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [iconName, iconSource]);

  useEffect(() => {
    if (iconSource !== "iconify" || !iconifyRawSvg) return;
    setIconDataUri(
      tintSvg(iconifyRawSvg, effIconColor === "auto" ? "auto" : effIconColor || "#000000")
    );
  }, [iconifyRawSvg, effIconColor, iconSource]);

  useEffect(() => {
    if (!iconSearch.trim()) {
      setIconResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const r = await searchIconify(iconSearch.trim());
      setIconResults(r);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [iconSearch]);

  const shadowOn = shadowOpacity > 0;
  const applyToText = shadowOn && (shadowTarget === "all" || shadowTarget === "text");
  const applyToIcon = shadowOn && (shadowTarget === "all" || shadowTarget === "icon");

  const textY = H / 2;
  const measure = (t: string) => {
    let w = 0;
    for (const ch of t) {
      w += /[一-鿿　-〿＀-￯]/.test(ch) ? effFontSize : effFontSize * 0.6;
    }
    return w;
  };
  const estLeftW = measure(leftText);
  const estRightW = measure(rightText);
  const iconW = showIcon ? effSize : 0;
  const gapLeft = leftText ? effGap : 0;
  const gapRight = rightText ? effGap : 0;
  const totalW = estLeftW + gapLeft + iconW + gapRight + estRightW;
  const startX = (W - totalW) / 2;
  const iconX = startX + estLeftW + gapLeft;
  const rightX = iconX + iconW + gapRight;
  const family = customFont ? `${customFont}, sans-serif` : "sans-serif";

  const previewSvgRef = useRef<SVGSVGElement>(null);

  const safeUri = (u: string) => u.replace(/#/g, "%23").replace(/"/g, "%22");

  function serializePreviewSvg(): string | null {
    const svgEl = previewSvgRef.current;
    if (!svgEl) return null;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".canvas-border, .ratio-guide").forEach((n) => n.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", String(W));
    clone.setAttribute("height", String(H));
    clone.removeAttribute("style");
    clone.removeAttribute("class");
    clone.querySelectorAll("image").forEach((img) => {
      const href = img.getAttribute("href");
      if (href) img.setAttribute("xlink:href", href);
    });
    return new XMLSerializer().serializeToString(clone);
  }

  function pickIcon(name: string) {
    setIconName(name);
    setIconSource("iconify");
    setIconifyRawSvg("");
  }

  function uploadIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIconSource("upload");
      setIconifyRawSvg("");
      setIconDataUri(String(reader.result));
    };
    reader.readAsDataURL(f);
  }

  function uploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(String(reader.result));
    reader.readAsDataURL(f);
  }

  function uploadFont(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFontError(false);
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const name = `cover-font-${Date.now()}`;
      const face = new FontFace(name, `url(${src})`);
      face.load().then((loaded) => {
        document.fonts.add(loaded);
        setCustomFont(name);
      }).catch(() => {
        setFontError(true);
      });
    };
    reader.readAsDataURL(f);
  }

  function exportImage() {
    const svgString = serializePreviewSvg();
    if (!svgString) return;
    if (format === "SVG") {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, W, H);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${fileName}.png`;
      a.click();
    };
    const exportBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(exportBlob);
  }

  const textCard = (
    <Card title="文本设置">
      <Field label={<label htmlFor="left-text">左侧文字</label>}>
        <input id="left-text" type="text" value={leftText} onChange={(e) => setLeftText(e.target.value)} className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm" />
      </Field>
      <Field label={<label htmlFor="right-text">右侧文字</label>}>
        <input id="right-text" type="text" value={rightText} onChange={(e) => setRightText(e.target.value)} className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm" />
      </Field>
      <Slider value={fontWeight} name="字体粗细" min={100} max={900} step={100} onChange={setFontWeight} format={(v) => String(v)} />
      <div className="pt-4 border-t border-border space-y-4">
        <Field label="自定义字体">
          {fontSupported ? (
            <div>
              <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" id="font-upload" onChange={uploadFont} />
              <label htmlFor="font-upload" className="flex items-center justify-center w-full h-16 border-2 border-border border-dashed cursor-pointer hover:border-primary">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <span className="inline-flex items-center justify-center shrink-0 leading-none h-5 w-5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-full block" fill="currentColor" aria-hidden="true"><path d="m18.5 4l1.16 4.35l-.96.26c-.45-.87-.91-1.74-1.44-2.18C16.73 6 16.11 6 15.5 6H13v10.5c0 .5 0 1 .33 1.25c.34.25 1 .25 1.67.25v1H9v-1c.67 0 1.33 0 1.67-.25c.33-.25.33-.75.33-1.25V6H8.5c-.61 0-1.23 0-1.76.43c-.53.44-.99 1.31-1.44 2.18l-.96-.26L5.5 4z" /></svg>
                  </span>
                  <span className="text-xs">点击上传字体</span>
                </div>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-16 border-2 border-border border-dashed">
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="inline-flex items-center justify-center shrink-0 leading-none h-5 w-5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-full block" fill="currentColor" aria-hidden="true"><path d="m18.5 4l1.16 4.35l-.96.26c-.45-.87-.91-1.74-1.44-2.18C16.73 6 16.11 6 15.5 6H13v10.5c0 .5 0 1 .33 1.25c.34.25 1 .25 1.67.25v1H9v-1c.67 0 1.33 0 1.67-.25c.33-.25.33-.75.33-1.25V6H8.5c-.61 0-1.23 0-1.76.43c-.53.44-.99 1.31-1.44 2.18l-.96-.26L5.5 4z" /></svg>
                </span>
                <span className="text-xs">不支持</span>
              </div>
            </div>
          )}
        </Field>
        <p className="text-xs text-muted-foreground">
          {!fontSupported ? "您的浏览器不支持自定义字体" : fontError ? "字体加载失败，请检查文件是否有效" : customFont ? `已加载字体: ${customFont}` : "上传 .ttf/.otf/.woff/.woff2 字体文件"}
        </p>
      </div>
    </Card>
  );

  const iconCard = (
    <Card title="图标设置" extra={<Toggle checked={showIcon} onChange={setShowIcon} label="显示图标" />}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input type="file" accept="image/*" className="hidden" id="icon-upload" onChange={uploadIcon} />
          <label htmlFor="icon-upload" className="flex items-center justify-center h-10 border-2 border-border border-dashed cursor-pointer hover:border-primary">
            <span className="inline-flex items-center justify-center shrink-0 leading-none mr-2 h-4 w-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-full block" fill="currentColor" aria-hidden="true"><path d="m8.5 13.5l2.5 3l3.5-4.5l4.5 6H5m16 1V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2" /></svg>
            </span>
            <span className="text-xs">上传图标</span>
          </label>
        </div>
        <input type="text" placeholder="搜索图标库..." value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} className="flex h-10 w-full border border-input bg-transparent px-3 py-1 text-sm" />
      </div>
      {iconResults.length > 0 && (
        <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
          {iconResults.map((name) => (
            <button key={name} onClick={() => pickIcon(name)} className="flex items-center justify-center h-8 border border-border hover:bg-foreground hover:text-background" title={name}>
              <img src={`${ICONIFY_BASE}/${name.replace(":", "/")}.svg`} alt={name} className="size-4" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {searching && <p className="text-xs text-muted-foreground">搜索中…</p>}
      <div className="text-xs text-muted-foreground">当前: {iconName}</div>
    </Card>
  );

  const bgCard = (
    <Card title="背景图片">
      <div>
        <input type="file" accept="image/*" className="hidden" id="bg-upload" onChange={uploadBg} />
        <label htmlFor="bg-upload" className="flex items-center justify-center w-full h-24 border-2 border-border border-dashed cursor-pointer hover:border-primary">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="inline-flex items-center justify-center shrink-0 leading-none h-6 w-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-full block" fill="currentColor" aria-hidden="true"><path d="M9 16v-6H5l7-7l7 7h-4v6zm-4 4v-2h14v2z" /></svg>
            </span>
            <span className="text-xs">点击或拖拽上传</span>
          </div>
        </label>
      </div>
    </Card>
  );

  const sizeCard = (
    <Card title="尺寸设置" extra={<Toggle checked={proportional} onChange={(v) => {
      setProportional(v);
      lastFontSizeRef.current = fontSize;
      lastIconSizeRef.current = iconSize;
    }} label="等比缩放" />}>
      <Slider value={fontSize} name="字体大小" min={20} max={700} onChange={handleFontSizeChange} format={(v) => `${v}px`} />
      <Slider value={iconSize} name="图标大小" min={20} max={700} onChange={handleIconSizeChange} format={(v) => `${v}px`} />
      <Slider value={iconRound} name="图标圆角" min={0} max={50} onChange={setIconRound} format={(v) => `${v}%`} />
      <Slider value={gap} name="间距" min={0} max={200} onChange={setGap} format={(v) => `${v}px`} />
    </Card>
  );

  const colorCard = (
    <Card title="颜色设置" extra={
      <div className="flex gap-2">
        <Toggle checked={iconColorSync} onChange={setIconColorSync} label="颜色同步" />
        <Toggle checked={iconOriginalColor} onChange={setIconOriginalColor} label="原色图标" />
      </div>
    }>
      <ColorField label="文字颜色" value={textColor} onChange={setTextColor} />
      <ColorField label="图标颜色" value={iconColor} onChange={setIconColor} disabled={iconColorSync || iconOriginalColor} />
      <ColorField label="背景颜色" value={bgColor} onChange={setBgColor} />
      <Slider value={bgOpacity} name="背景不透明度" min={0} max={1} step={0.01} onChange={setBgOpacity} format={(v) => `${Math.round(v * 100)}%`} minLabel="0%" maxLabel="100%" />
    </Card>
  );

  const iconBgCard = (
    <Card title="图标背景">
      <ToggleRow checked={iconBg} onChange={setIconBg} label="启用图标背景" />
    </Card>
  );

  const shadowCard = (
    <Card title="阴影设置" extra={
      <div className="flex gap-1 border border-border p-1">
        {SHADOW_TARGETS.map((t) => (
          <SegButton key={t.id} active={shadowTarget === t.id} title={t.title} path={t.path} onClick={() => setShadowTarget(t.id as "all" | "text" | "icon")} />
        ))}
      </div>
    }>
      <ColorField label="颜色" value={shadowColor} onChange={setShadowColor} />
      <div className="grid grid-cols-3 gap-2">
        <Field label={<span className="text-xs">模糊</span>}>
          <NumberInput value={shadowBlur} onChange={setShadowBlur} />
        </Field>
        <Field label={<span className="text-xs">水平</span>}>
          <NumberInput value={shadowX} onChange={setShadowX} />
        </Field>
        <Field label={<span className="text-xs">垂直</span>}>
          <NumberInput value={shadowY} onChange={setShadowY} />
        </Field>
      </div>
      <Slider value={shadowOpacity} name="不透明度" min={0} max={1} step={0.01} onChange={setShadowOpacity} format={(v) => `${Math.round(v * 100)}%`} minLabel="0%" maxLabel="100%" />
    </Card>
  );

  const ratioCard = (
    <Card title="画板比例">
      <div className="grid grid-cols-2 gap-2">
        {RATIOS.map((r) => {
          const active = ratio === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRatio(r.id)}
              className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${active ? "border-border bg-card" : "border-input hover:bg-foreground hover:text-background"}`}
            >
              <span className={`relative flex size-4 shrink-0 items-center justify-center border ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                {active && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span className="font-mono">{r.id}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );

  const scaleCard = (
    <Card title="缩放倍率">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((s) => {
          const active = scale === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${active ? "border-border bg-card" : "border-input hover:bg-foreground hover:text-background"}`}
            >
              <span className={`relative flex size-4 shrink-0 items-center justify-center border ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                {active && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span className="font-mono">{s}x</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{W}x{H} px</p>
    </Card>
  );

  const exportCard = (
    <Card title="导出设置">
      <Field label="文件名">
        <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm" />
      </Field>
      <Field label="格式">
        <div className="flex border overflow-hidden">
          <button onClick={() => setFormat("PNG")} className={`flex-1 py-2 text-sm font-bold transition-colors ${format === "PNG" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>PNG</button>
          <button onClick={() => setFormat("SVG")} className={`flex-1 py-2 text-sm font-bold transition-colors ${format === "SVG" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>SVG</button>
        </div>
      </Field>
      <ToggleRow checked={transparent} onChange={setTransparent} label="背景透明" />
      <button onClick={exportImage} className="inline-flex items-center justify-center border font-mono text-sm font-medium border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-foreground h-9 px-4 w-full">
        <span className="inline-flex items-center justify-center shrink-0 leading-none mr-2 h-5 w-5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-full block" fill="currentColor" aria-hidden="true"><path d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7z" /></svg>
        </span>
        导出图片
      </button>
    </Card>
  );

  return (
    <main className="container mx-auto max-w-[1920px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">封面制作</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <p>在线生成精美的封面图片</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="flex-1 lg:max-w-[55%]">
          <div className="lg:sticky lg:top-20">
            <div className="w-full overflow-hidden flex justify-center bg-card p-4 select-none touch-none">
              <svg
                ref={previewSvgRef}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${W} ${H}`}
                className="block select-none w-full h-auto"
                style={{ maxWidth: `${W}px` }}
              >
                {shadowOn && (
                  <defs>
                    <filter id="cover-shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx={shadowX} dy={shadowY} stdDeviation={shadowBlur} floodColor={shadowColor} floodOpacity={shadowOpacity} />
                    </filter>
                  </defs>
                )}
                {bgImage && (
                  <image href={safeUri(bgImage)} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
                )}
                {!transparent && (
                  <rect x="0" y="0" width={W} height={H} fill={bgColor} opacity={bgOpacity} />
                )}
                {leftText && (
                  <text
                    x={startX}
                    y={textY}
                    fontSize={effFontSize}
                    fontWeight={fontWeight}
                    fill={effTextColor}
                    dominantBaseline="central"
                    textAnchor="start"
                    fontFamily={family}
                    filter={applyToText ? "url(#cover-shadow)" : undefined}
                  >
                    {leftText}
                  </text>
                )}
                {showIcon && iconDataUri && iconBg && (
                  <rect x={iconX} y={textY - effSize / 2} width={effSize} height={effSize} rx={(iconRound / 100) * effSize} fill="#00000022" />
                )}
                {showIcon && iconDataUri && (
                  <image href={safeUri(iconDataUri)} x={iconX} y={textY - effSize / 2} width={effSize} height={effSize} preserveAspectRatio="xMidYMid meet" filter={applyToIcon ? "url(#cover-shadow)" : undefined} />
                )}
                {rightText && (
                  <text
                    x={rightX}
                    y={textY}
                    fontSize={effFontSize}
                    fontWeight={fontWeight}
                    fill={effTextColor}
                    dominantBaseline="central"
                    textAnchor="start"
                    fontFamily={family}
                    filter={applyToText ? "url(#cover-shadow)" : undefined}
                  >
                    {rightText}
                  </text>
                )}
                <rect x="0" y="0" width={W} height={H} fill="none" stroke="rgba(255, 0, 0, 0.8)" strokeWidth="2" className="canvas-border" />
                <g className="ratio-guide">
                  <rect x="0" y="0" width={W} height={H} fill="none" stroke="rgba(255, 0, 0, 0.5)" strokeWidth="2" strokeDasharray="10 5" />
                  <text x="10" y="30" fill="rgba(255, 0, 0, 0.5)" fontSize="20">{ratio}</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full lg:flex-1">
          <div className="lg:hidden">
            <div className="flex border-b border-border mb-6">
              <button onClick={() => setTab("content")} className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${tab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>内容</button>
              <button onClick={() => setTab("style")} className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${tab === "style" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>样式</button>
              <button onClick={() => setTab("export")} className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${tab === "export" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>导出</button>
            </div>
            {tab === "content" && <div className="space-y-6">{textCard}{iconCard}{bgCard}</div>}
            {tab === "style" && <div className="space-y-6">{sizeCard}{colorCard}{iconBgCard}{shadowCard}</div>}
            {tab === "export" && <div className="space-y-6">{ratioCard}{scaleCard}{exportCard}</div>}
          </div>

          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">内容</h2>
              {textCard}{iconCard}{bgCard}
            </div>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">样式</h2>
              {sizeCard}{colorCard}{iconBgCard}{shadowCard}
            </div>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">导出</h2>
              {ratioCard}{scaleCard}{exportCard}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}