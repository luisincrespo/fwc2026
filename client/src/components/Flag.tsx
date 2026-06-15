interface Props {
  code: string;
  size?: number;
}

export function Flag({ code, size = 20 }: Props) {
  const height = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size}x${height}/${code}.png`}
      width={size}
      height={height}
      alt={code}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 2 }}
    />
  );
}
