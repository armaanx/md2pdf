"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  renderThemeFontChoices,
  renderThemePresets,
  type RenderThemeConfig,
  type RenderThemePresetId
} from "@md2pdf/renderer/theme";
import { Layers3, MoonStar, PaintBucket, SunMedium, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeStudioPanelProps = {
  activePresetId: RenderThemePresetId | "custom";
  theme: RenderThemeConfig;
  onPresetChange: (presetId: RenderThemePresetId) => void;
  onThemeChange: (theme: RenderThemeConfig) => void;
};

type ColorFieldKey =
  | "backgroundColor"
  | "sheetColor"
  | "textColor"
  | "mutedColor"
  | "lineColor"
  | "accentColor"
  | "accentSoftColor"
  | "codeBackground"
  | "codeText"
  | "tableHeadColor"
  | "blockquoteColor";

const colorFields: Array<{ key: ColorFieldKey; label: string }> = [
  { key: "backgroundColor", label: "Canvas" },
  { key: "sheetColor", label: "Paper" },
  { key: "textColor", label: "Text" },
  { key: "mutedColor", label: "Muted Text" },
  { key: "lineColor", label: "Rules" },
  { key: "accentColor", label: "Accent" },
  { key: "accentSoftColor", label: "Soft Accent" },
  { key: "codeBackground", label: "Code Background" },
  { key: "codeText", label: "Code Text" },
  { key: "tableHeadColor", label: "Table Header" },
  { key: "blockquoteColor", label: "Quote Background" }
];

function isHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function Section({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#1f2022] p-4 md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-white/8 bg-black/15 p-2 text-[#8fbfd0]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="min-w-0 rounded-xl border border-white/6 bg-black/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground">{label}</span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea2aa]">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--ring)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 rounded-xl border border-white/6 bg-black/10 p-3">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-white/10 bg-[#18191b] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--ring)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-white/6 bg-black/10 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
          checked
            ? "border-[var(--ring)]/50 bg-[color:rgba(73,215,255,0.2)]"
            : "border-white/10 bg-[#18191b]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full transition-all ${
            checked ? "left-6 bg-[var(--ring)]" : "left-1 bg-[#74828a]"
          }`}
        />
      </button>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value.toUpperCase());

  useEffect(() => {
    setDraftValue(value.toUpperCase());
  }, [value]);

  return (
    <label className="min-w-0 rounded-xl border border-white/6 bg-black/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground">{label}</span>
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-white/10"
          style={{ background: value }}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full shrink-0 rounded-lg border border-white/10 bg-transparent p-1 sm:w-12"
        />
        <input
          type="text"
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();

            if (nextValue.length <= 7 && /^#?[0-9A-F]*$/.test(nextValue)) {
              setDraftValue(nextValue.startsWith("#") ? nextValue : `#${nextValue}`);
            }
          }}
          onBlur={(event) => {
            const nextValue = event.target.value.toUpperCase();
            if (isHex(nextValue)) {
              onChange(nextValue);
              setDraftValue(nextValue);
              return;
            }

            setDraftValue(value.toUpperCase());
          }}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#18191b] px-3 py-2 font-mono text-sm uppercase text-foreground outline-none focus:border-[var(--ring)]"
        />
      </div>
    </label>
  );
}

function AutoGrid({
  children,
  minWidth = 220
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function ThemeStudioPanel({
  activePresetId,
  theme,
  onPresetChange,
  onThemeChange
}: ThemeStudioPanelProps) {
  function updateTheme<K extends keyof RenderThemeConfig>(key: K, value: RenderThemeConfig[K]) {
    onThemeChange({
      ...theme,
      [key]: value
    });
  }

  const activePreset =
    activePresetId === "custom"
      ? null
      : renderThemePresets.find((preset) => preset.id === activePresetId) ?? null;

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Style Lab
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Adjust the PDF look and keep preview and export in sync. Presets now include a wider
              mix of dark document themes and more refined serif and sans font pairings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/8 bg-[#1f2022] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea2aa]">
              {activePreset ? `${activePreset.label} ${activePreset.tone === "dark" ? "Dark" : "Light"}` : "Custom"}
            </span>
            <Button type="button" onClick={() => onPresetChange("studio")} className="rounded-lg">
              Reset
            </Button>
          </div>
        </div>

        <Section
          title="Preset Theme"
          description="Start from a polished preset, then fine-tune details below."
          icon={<PaintBucket className="size-4" />}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <SelectField
              label="Theme"
              value={activePresetId === "custom" ? "studio" : activePresetId}
              options={renderThemePresets.map((preset) => ({
                value: preset.id,
                label: `${preset.label} (${preset.tone === "dark" ? "Dark" : "Light"})`
              }))}
              onChange={(value) => onPresetChange(value as RenderThemePresetId)}
            />
            <div className="rounded-xl border border-white/6 bg-black/10 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <span>{activePreset?.label ?? "Custom Mix"}</span>
                <span className="rounded-full border border-white/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ea2aa]">
                  {activePreset?.tone ?? "custom"}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme.accentColor }} />
                <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme.sheetColor }} />
                <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme.backgroundColor }} />
                <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme.codeBackground }} />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {activePreset?.description ??
                  "Live controls have diverged from the selected preset. Export will use this custom mix."}
              </p>
            </div>
          </div>
        </Section>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Section
            title="Typography"
            description="Fonts, type scale, and reading rhythm."
            icon={<Type className="size-4" />}
          >
            <AutoGrid>
              <SelectField
                label="Body Font"
                value={theme.bodyFont}
                options={renderThemeFontChoices.map((choice) => ({
                  value: choice.id,
                  label: choice.label
                }))}
                onChange={(value) =>
                  updateTheme("bodyFont", value as RenderThemeConfig["bodyFont"])
                }
              />
              <SelectField
                label="Heading Font"
                value={theme.headingFont}
                options={renderThemeFontChoices.map((choice) => ({
                  value: choice.id,
                  label: choice.label
                }))}
                onChange={(value) =>
                  updateTheme("headingFont", value as RenderThemeConfig["headingFont"])
                }
              />
              <RangeField
                label="Base Font Size"
                value={theme.fontSize}
                min={12}
                max={20}
                step={1}
                displayValue={`${theme.fontSize}px`}
                onChange={(value) => updateTheme("fontSize", value)}
              />
              <RangeField
                label="Line Height"
                value={theme.lineHeight}
                min={1.2}
                max={2}
                step={0.05}
                displayValue={theme.lineHeight.toFixed(2)}
                onChange={(value) => updateTheme("lineHeight", Number(value.toFixed(2)))}
              />
              <RangeField
                label="Heading 1"
                value={theme.h1Size}
                min={22}
                max={42}
                step={1}
                displayValue={`${theme.h1Size}px`}
                onChange={(value) => updateTheme("h1Size", value)}
              />
              <RangeField
                label="Heading 2"
                value={theme.h2Size}
                min={16}
                max={32}
                step={1}
                displayValue={`${theme.h2Size}px`}
                onChange={(value) => updateTheme("h2Size", value)}
              />
              <RangeField
                label="Heading 3"
                value={theme.h3Size}
                min={14}
                max={26}
                step={1}
                displayValue={`${theme.h3Size}px`}
                onChange={(value) => updateTheme("h3Size", value)}
              />
            </AutoGrid>
          </Section>

          <Section
            title="Layout"
            description="Whitespace and paper geometry."
            icon={activePreset?.tone === "dark" ? <MoonStar className="size-4" /> : <SunMedium className="size-4" />}
          >
            <AutoGrid>
              <RangeField
                label="Page Padding"
                value={theme.pagePadding}
                min={28}
                max={88}
                step={1}
                displayValue={`${theme.pagePadding}px`}
                onChange={(value) => updateTheme("pagePadding", value)}
              />
              <RangeField
                label="Sheet Radius"
                value={theme.pageRadius}
                min={0}
                max={28}
                step={1}
                displayValue={`${theme.pageRadius}px`}
                onChange={(value) => updateTheme("pageRadius", value)}
              />
            </AutoGrid>
          </Section>
        </div>

        <Section
          title="Shadow"
          description="Control whether the sheet floats and how strong that elevation feels."
          icon={<Layers3 className="size-4" />}
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ToggleField
              label="Sheet Shadow"
              description="Disable for a flatter, print-like page or enable to keep the elevated preview look."
              checked={theme.shadowEnabled}
              onChange={(checked) => updateTheme("shadowEnabled", checked)}
            />
            <AutoGrid>
              <RangeField
                label="Lift"
                value={theme.shadowOffsetY}
                min={0}
                max={40}
                step={1}
                displayValue={`${theme.shadowOffsetY}px`}
                onChange={(value) => updateTheme("shadowOffsetY", value)}
              />
              <RangeField
                label="Blur"
                value={theme.shadowBlur}
                min={0}
                max={100}
                step={1}
                displayValue={`${theme.shadowBlur}px`}
                onChange={(value) => updateTheme("shadowBlur", value)}
              />
              <RangeField
                label="Opacity"
                value={theme.shadowOpacity}
                min={0}
                max={0.5}
                step={0.01}
                displayValue={theme.shadowOpacity.toFixed(2)}
                onChange={(value) => updateTheme("shadowOpacity", Number(value.toFixed(2)))}
              />
              <ColorField
                label="Shadow Color"
                value={theme.shadowColor}
                onChange={(value) => updateTheme("shadowColor", value)}
              />
            </AutoGrid>
          </div>
        </Section>

        <Section
          title="Color System"
          description="Responsive controls that adapt cleanly as the workspace resizes."
          icon={<PaintBucket className="size-4" />}
        >
          <AutoGrid minWidth={240}>
            {colorFields.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                value={theme[field.key]}
                onChange={(value) => updateTheme(field.key, value)}
              />
            ))}
          </AutoGrid>
        </Section>
      </div>
    </div>
  );
}
