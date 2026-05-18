interface BrandWordmarkProps {
  size?: 'hero' | 'compact';
}

export function BrandWordmark({ size = 'compact' }: BrandWordmarkProps) {
  return (
    <div className={`chrome-wordmark ${size === 'hero' ? 'chrome-wordmark--hero' : 'chrome-wordmark--compact'}`}>
      <span className="chrome-text">Card</span> <span className="accent-word">Cricket</span>
    </div>
  );
}
