/** An example's 32×32 preview: an island painted with its tileset (public/examples/previews, from make-examples). */
export function ExampleThumb({ file }: { file: string }) {
  return (
    <img
      src={`./examples/previews/${file}`}
      alt=""
      width={32}
      height={32}
      className="size-8 shrink-0 [image-rendering:pixelated]"
    />
  );
}
