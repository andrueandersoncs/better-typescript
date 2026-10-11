import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";

type Props = {
  busy: boolean;
  canPost: boolean;
  /** When non-null, shown as a tooltip over the disabled button. */
  disabledReason?: string | null;
  /** Defaults to "Post". */
  label?: string;
  type?: "submit" | "button";
  onClick?: () => void;
};

/**
 * Submit button for forum composers. When `canPost` is false and a
 * `disabledReason` is provided, wraps the disabled button in a Base-UI
 * Tooltip so the hint is visible on hover (native `title` doesn't fire
 * over `pointer-events:none` children in all browsers).
 */
export function PostButton({
  busy,
  canPost,
  disabledReason,
  label = "Post",
  type = "submit",
  onClick,
}: Props) {
  const text = busy ? `${label.replace(/…$/, "")}ing…` : label;
  const btn = (
    <Button type={type} size="sm" disabled={!canPost} onClick={onClick}>
      {text}
    </Button>
  );

  if (!disabledReason || canPost) return btn;

  return (
    <Tooltip.Root>
      {/* pointer-events: auto so the tooltip fires even though the
          button inside is disabled (pointer-events: none). */}
      <Tooltip.Trigger
        render={<span className="inline-flex cursor-not-allowed" style={{ pointerEvents: "auto" }} />}
      >
        {btn}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} side="top" className="z-[9999]">
          <Tooltip.Popup className="rounded-md border border-border bg-popover px-2 py-1.5 text-[11px] leading-snug text-popover-foreground shadow-lg">
            {disabledReason}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
